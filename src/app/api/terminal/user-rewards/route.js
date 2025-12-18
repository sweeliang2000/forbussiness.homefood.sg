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

export async function GET(request) {
  try {
    // Check if Supabase is configured
    if (!supabase) {
      const missingVars = [];
      if (!SUPABASE_URL) missingVars.push('SUPABASE_URL');
      if (!SUPABASE_SERVICE_ROLE_KEY) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
      
      return NextResponse.json(
        { 
          error: 'Supabase configuration is missing',
          details: `Missing environment variables: ${missingVars.join(', ')}`,
          hint: 'Make sure your .env file contains SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phone');
    const shopId = searchParams.get('shop_id');

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
    
    console.log('Fetching rewards for phone:', normalizedPhone, 'shop_id:', shopId, 'status: Collected');
    
    // Build query for user_rewards table with SQL filters
    // Filter by phone_number, shop_id, and status = 'Collected'
    let query = supabase
      .from('user_rewards')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('shop_id', shopId)
      .eq('status', 'Collected');

    // Execute query
    let { data, error } = await query;
    
    console.log('Initial query result:', { dataCount: data?.length, error: error?.message, sampleData: data?.[0] });

    if (error) {
      console.error('Supabase query error:', error);
      // Don't return error immediately, try alternative phone formats first
    }

    // If not found with exact match, try different phone formats
    if ((!data || data.length === 0) && !error) {
      // Try without country code (if phone starts with +65)
      if (normalizedPhone.startsWith('+65')) {
        const phoneWithoutCountryCode = normalizedPhone.substring(3);
        console.log('Trying phone without country code:', phoneWithoutCountryCode);
        let retryQuery = supabase
          .from('user_rewards')
          .select('*')
          .eq('phone_number', phoneWithoutCountryCode)
          .eq('shop_id', shopId)
          .eq('status', 'Collected');
        
        const result = await retryQuery;
        console.log('Retry query result (without country code):', { dataCount: result.data?.length, error: result.error?.message });
        if (result.data && result.data.length > 0) {
          data = result.data;
        }
      }
      
      // Try with just the digits
      if (!data || data.length === 0) {
        const phoneDigits = normalizedPhone.replace(/\D/g, '');
        console.log('Trying phone digits only:', phoneDigits);
        let retryQuery = supabase
          .from('user_rewards')
          .select('*')
          .eq('phone_number', phoneDigits)
          .eq('shop_id', shopId)
          .eq('status', 'Collected');
        
        const result = await retryQuery;
        console.log('Retry query result (digits only):', { dataCount: result.data?.length, error: result.error?.message });
        if (result.data) {
          data = result.data;
        }
      }
    }

    // If we still have an error after trying all formats, return it
    if (error && (!data || data.length === 0)) {
      console.error('Supabase query error after retries:', error);
      return NextResponse.json(
        { error: 'Database query failed', details: error.message },
        { status: 500 }
      );
    }

    // Return empty array if no rewards found (not an error)
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in user rewards API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    // Check if Supabase is configured
    if (!supabase) {
      const missingVars = [];
      if (!SUPABASE_URL) missingVars.push('SUPABASE_URL');
      if (!SUPABASE_SERVICE_ROLE_KEY) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
      
      return NextResponse.json(
        { 
          error: 'Supabase configuration is missing',
          details: `Missing environment variables: ${missingVars.join(', ')}`,
          hint: 'Make sure your .env file contains SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { reward_id } = body;

    if (!reward_id) {
      return NextResponse.json(
        { error: 'Reward ID is required' },
        { status: 400 }
      );
    }

    console.log('Updating reward status to Redeemed for reward_id:', reward_id);

    // Get current server datetime in ISO 8601 format (UTC)
    // This will be stored as timestamptz in PostgreSQL
    const now = new Date().toISOString();
    
    console.log('Setting claimed_at and updated_at to:', now);

    // Update the reward status to 'Redeemed' and set both claimed_at and updated_at to current server time
    const { data, error } = await supabase
      .from('user_rewards')
      .update({
        status: 'Redeemed',
        claimed_at: now,
        updated_at: now
      })
      .eq('id', reward_id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json(
        { error: 'Database update failed', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Reward not found' },
        { status: 404 }
      );
    }

    console.log('Reward status updated successfully:', data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in update reward status API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
