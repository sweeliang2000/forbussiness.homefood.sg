import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getUserDataFromRequest } from '@/utility/serverCookieUtils';

// Get Supabase configuration from environment variables (server-side only)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client with service role key for admin access (server-side only)
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

/**
 * GET /api/terminal/stamps
 * 
 * Retrieves stamp card information for a customer by phone number and shop ID.
 * 
 * Query Parameters:
 * - phone (required): Customer phone number
 * - shop_id (required): Shop ID to query stamps for
 * 
 * Returns:
 * - 200: Stamp card data if found
 * - 400: Missing required parameters
 * - 401: User not authenticated
 * - 404: Stamp card not found
 * - 500: Server error
 * 
 * Authentication:
 * - Requires valid user session (userDataNonHTTP cookie)
 * - User must be logged in to access this endpoint
 */
export async function GET(request) {
  try {
    // Check authentication - user must be logged in
    const userData = getUserDataFromRequest(request);
    if (!userData || !userData.user_id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please login to access this endpoint' },
        { status: 401 }
      );
    }

    // Check if Supabase is configured
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase configuration is missing' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phone');
    const shopId = searchParams.get('shop_id');

    // Validate required fields
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (!shopId) {
      return NextResponse.json(
        { error: 'Shop ID is required' },
        { status: 400 }
      );
    }

    // Normalize phone number - remove spaces, dashes, parentheses
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Query user_cards table for the stamp card
    const { data: card, error: queryError } = await supabase
      .from('user_cards')
      .select('id, stamps, expiry_date, created_at, updated_at, status, collected_rewards')
      .eq('shop_id', shopId)
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    if (queryError && queryError.code !== 'PGRST116') {
      console.error('Error querying stamp card:', queryError);
      return NextResponse.json(
        { error: 'Database query failed', details: queryError.message },
        { status: 500 }
      );
    }

    if (!card) {
      return NextResponse.json(
        { error: 'Stamp card not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      card: card
    });
  } catch (error) {
    console.error('Error in GET stamp card API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/terminal/stamps
 * 
 * Creates or updates a customer's stamp card by adding or removing stamps.
 * This endpoint handles both stamp collection (positive values) and stamp deduction (negative values).
 * 
 * Request Body:
 * - shop_id (required): The shop ID associated with the stamp card
 * - phone_number (required): Customer's phone number (will be normalized)
 * - stamp_change (required): Number of stamps to add (positive) or remove (negative)
 * - expirationType (optional): Type of expiration ('days', 'never', etc.)
 * - numberOfDaysToExpire (optional): Number of days until expiration (only used for new cards)
 * - performed_by (optional): User ID who performed the action (auto-filled from session)
 * - performed_by_name (optional): Name/email of user who performed the action (auto-filled from session)
 * - notes (optional): Additional notes about the transaction
 * 
 * Behavior:
 * 1. If card exists: Updates the stamp count (prevents going below 0)
 * 2. If card doesn't exist: Creates a new card with initial stamps
 * 3. Logs all transactions to terminal_logs table for audit trail
 * 4. Returns the updated/created card data
 * 
 * Returns:
 * - 200: Success with card data
 * - 400: Missing required parameters
 * - 401: User not authenticated
 * - 500: Server error
 * 
 * Authentication:
 * - Requires valid user session (userDataNonHTTP cookie)
 * - User must be logged in to perform stamp operations
 * - User ID and email are automatically extracted from session and logged
 * 
 * Example Response (existing card):
 * {
 *   success: true,
 *   action: "updated",
 *   card: { ... },
 *   message: "Stamps increased successfully",
 *   wasLimited: false,
 *   requestedChange: 5,
 *   actualChange: 5
 * }
 * 
 * Example Response (new card):
 * {
 *   success: true,
 *   action: "created",
 *   card: { ... },
 *   message: "New card created successfully"
 * }
 */
export async function POST(request) {
  try {
    // Check authentication - user must be logged in
    const userData = getUserDataFromRequest(request);
    if (!userData || !userData.user_id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please login to access this endpoint' },
        { status: 401 }
      );
    }

    // Check if Supabase is configured
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase configuration is missing' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { 
      shop_id, 
      phone_number, 
      stamp_change, 
      expirationType, 
      numberOfDaysToExpire,
      performed_by,
      performed_by_name,
      notes
    } = body;

    // Extract user data from authenticated session
    // These values are used for audit logging in terminal_logs
    const performedByUserId = userData.user_id;
    const performedByEmail = userData.email || null;

    // Validate required fields
    if (!shop_id || !phone_number || stamp_change === undefined) {
      return NextResponse.json(
        { error: 'shop_id, phone_number, and stamp_change are required' },
        { status: 400 }
      );
    }

    console.log('phone_number', phone_number);

    // Normalize phone number - remove spaces, dashes, and parentheses for consistent storage
    // This ensures "123-456-7890", "(123) 456-7890", and "1234567890" are treated the same
    const normalizedPhone = phone_number.replace(/[\s\-\(\)]/g, '');

    // Get current server time in UTC for consistent timestamping
    // All database operations use server time to avoid timezone issues
    const now = new Date();
    const nowUTC = now.toISOString();

    // Check if user card exists in the database
    // Uses maybeSingle() to return null if not found instead of throwing an error
    const { data: existingCard, error: checkError } = await supabase
      .from('user_cards')
      .select('id, stamps, expiry_date, created_at, updated_at')
      .eq('shop_id', shop_id)
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking for existing card:', checkError);
      return NextResponse.json(
        { error: 'Database query failed', details: checkError.message },
        { status: 500 }
      );
    }

    if (existingCard) {
      // ===== EXISTING CARD LOGIC =====
      // Card exists - update the stamp count and timestamp
      
      // Calculate new stamp count by adding the change to current stamps
      const currentStamps = existingCard.stamps || 0;
      const calculatedStamps = currentStamps + stamp_change;
      
      // Prevent negative stamps - if redemption would go below 0, cap at 0
      // This protects against over-redemption scenarios
      const newStamps = Math.max(0, calculatedStamps);
      
      // Calculate the actual change applied (may be less than requested if capped at 0)
      // Example: If user has 3 stamps and tries to redeem 5, actualStampChange = -3 (not -5)
      const actualStampChange = newStamps - currentStamps;

      const { data: updatedCard, error: updateError } = await supabase
        .from('user_cards')
        .update({
          stamps: newStamps,
          updated_at: nowUTC
        })
        .eq('id', existingCard.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating card:', updateError);
        return NextResponse.json(
          { error: 'Failed to update card', details: updateError.message },
          { status: 500 }
        );
      }

      // ===== AUDIT LOGGING =====
      // Log the transaction to terminal_logs for audit trail
      // This creates a permanent record of who did what and when
      // Use actualStampChange (not requested change) to log what was actually applied
      // Valid transaction_type values: 'stamp_collection', 'reward_redemption', 'reward_collection', 'stamp_deduction'
      const transactionType = actualStampChange >= 0 ? 'stamp_collection' : 'stamp_deduction';
      const { error: logError } = await supabase
        .from('terminal_logs')
        .insert({
          shop_id: shop_id,
          phone_number: normalizedPhone,
          user_card_id: existingCard.id,
          transaction_type: transactionType,
          stamps_amount: actualStampChange, // Log the actual change applied
          reward_id: null,
          reward_name: null,
          reward_description: null,
          performed_by: performedByUserId,
          performed_by_name: performedByEmail,
          notes: notes || null,
          created_at: nowUTC
        });

      if (logError) {
        console.error('Error logging transaction:', logError);
        // Don't fail the request if logging fails, just log the error
      }

      // Check if the redemption was limited (user tried to redeem more than available)
      const wasLimited = stamp_change < 0 && actualStampChange > stamp_change;
      const message = wasLimited 
        ? `Stamps decreased by ${Math.abs(actualStampChange)} (limited to available stamps)`
        : `Stamps ${stamp_change >= 0 ? 'increased' : 'decreased'} successfully`;

      // Return success response with updated card and metadata
      return NextResponse.json({
        success: true,
        action: 'updated',
        card: updatedCard,
        message: message,
        wasLimited: wasLimited, // Indicates if redemption was capped
        requestedChange: stamp_change, // What was requested
        actualChange: actualStampChange // What was actually applied
      });
    } else {
      // ===== NEW CARD CREATION LOGIC =====
      // Card doesn't exist - create a new stamp card for this customer
      
      // Calculate expiry_date based on expirationType and numberOfDaysToExpire
      // Only set expiry if both parameters are provided
      let expiryDate = null;
      
      if (expirationType && numberOfDaysToExpire) {
        const expiryDateObj = new Date(now);
        expiryDateObj.setUTCDate(expiryDateObj.getUTCDate() + parseInt(numberOfDaysToExpire));
        expiryDate = expiryDateObj.toISOString();
      }

      // For new cards, prevent negative initial stamps
      // You can't create a card with negative stamps
      const initialStamps = Math.max(0, stamp_change);

      // Insert new card into database with default values
      const { data: newCard, error: createError } = await supabase
        .from('user_cards')
        .insert({
          shop_id: shop_id,
          phone_number: normalizedPhone,
          stamps: initialStamps,
          expiry_date: expiryDate, // null if no expiration set
          status: 'Using', // Default status for new cards (active)
          created_at: nowUTC,
          updated_at: nowUTC,
          collected_rewards: [] // Initialize as empty array - tracks redeemed rewards
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating card:', createError);
        return NextResponse.json(
          { error: 'Failed to create card', details: createError.message },
          { status: 500 }
        );
      }

      // ===== AUDIT LOGGING FOR NEW CARD =====
      // Log the initial transaction that created the card
      // Valid transaction_type values: 'stamp_collection', 'stamp_redemption', 'reward_collection', 'stamp_deduction'
      const transactionType = stamp_change >= 0 ? 'stamp_collection' : 'stamp_deduction';
      const { error: logError } = await supabase
        .from('terminal_logs')
        .insert({
          shop_id: shop_id,
          phone_number: normalizedPhone,
          user_card_id: newCard.id,
          transaction_type: transactionType,
          stamps_amount: stamp_change,
          reward_id: null,
          reward_name: null,
          reward_description: null,
          performed_by: performedByUserId,
          performed_by_name: performedByEmail,
          notes: notes || null,
          created_at: nowUTC
        });

      if (logError) {
        console.error('Error logging transaction:', logError);
        // Don't fail the request if logging fails, just log the error
      }

      return NextResponse.json({
        success: true,
        action: 'created',
        card: newCard,
        message: 'New card created successfully'
      });
    }
  } catch (error) {
    console.error('Error in stamp update API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
