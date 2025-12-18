import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

export async function POST(request) {
  try {
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

    // Validate required fields
    if (!shop_id || !phone_number || stamp_change === undefined) {
      return NextResponse.json(
        { error: 'shop_id, phone_number, and stamp_change are required' },
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalizedPhone = phone_number.replace(/[\s\-\(\)]/g, '');

    // Get current server time in UTC
    const now = new Date();
    const nowUTC = now.toISOString();

    // Check if user card exists
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
      // Card exists - update stamps and updated_at only
      // Calculate new stamps, but prevent going below 0
      const currentStamps = existingCard.stamps || 0;
      const calculatedStamps = currentStamps + stamp_change;
      const newStamps = Math.max(0, calculatedStamps);
      
      // If redemption would go below 0, adjust the actual redemption amount
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

      // Log transaction to terminal_logs
      // Use actualStampChange (adjusted if redemption would go below 0)
      const transactionType = actualStampChange >= 0 ? 'stamp_given' : 'stamp_removed';
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
          performed_by: performed_by || null,
          performed_by_name: performed_by_name || null,
          notes: notes || null,
          created_at: nowUTC
        });

      if (logError) {
        console.error('Error logging transaction:', logError);
        // Don't fail the request if logging fails, just log the error
      }

      // Check if redemption was limited
      const wasLimited = stamp_change < 0 && actualStampChange > stamp_change;
      const message = wasLimited 
        ? `Stamps decreased by ${Math.abs(actualStampChange)} (limited to available stamps)`
        : `Stamps ${stamp_change >= 0 ? 'increased' : 'decreased'} successfully`;

      return NextResponse.json({
        success: true,
        action: 'updated',
        card: updatedCard,
        message: message,
        wasLimited: wasLimited,
        requestedChange: stamp_change,
        actualChange: actualStampChange
      });
    } else {
      // Card doesn't exist - create new one
      // Calculate expiry_date based on expirationType and numberOfDaysToExpire
      let expiryDate = null;
      
      if (expirationType && numberOfDaysToExpire) {
        const expiryDateObj = new Date(now);
        expiryDateObj.setUTCDate(expiryDateObj.getUTCDate() + parseInt(numberOfDaysToExpire));
        expiryDate = expiryDateObj.toISOString();
      }

      // For new cards, prevent negative stamps
      const initialStamps = Math.max(0, stamp_change);

      const { data: newCard, error: createError } = await supabase
        .from('user_cards')
        .insert({
          shop_id: shop_id,
          phone_number: normalizedPhone,
          stamps: initialStamps,
          expiry_date: expiryDate,
          status: 'Using', // Default status for new cards
          created_at: nowUTC,
          updated_at: nowUTC,
          collected_rewards: [] // Initialize as empty array
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

      // Log transaction to terminal_logs
      const transactionType = stamp_change >= 0 ? 'stamp_given' : 'stamp_removed';
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
          performed_by: performed_by || null,
          performed_by_name: performed_by_name || null,
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
