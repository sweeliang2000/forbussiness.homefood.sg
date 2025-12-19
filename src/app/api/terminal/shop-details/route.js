import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Get Supabase configuration from environment variables (server-side only)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase configuration is missing:');
  console.error('SUPABASE_URL:', SUPABASE_URL ? '✓ Set' : '✗ Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing');
  console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));
}

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
    const shopId = searchParams.get('shop_id');

    if (!shopId) {
      return NextResponse.json(
        { error: 'shop_id is required' },
        { status: 400 }
      );
    }

    // Query the live_shop_details table
    const { data, error } = await supabase
      .from('live_shop_details')
      .select('shop_id, StampData')
      .eq('shop_id', shopId)
      .maybeSingle();

    // Get shop name from customer_facing_business_details or shops table
    let shopName = null;
    try {
      const shopNameResult = await supabase
        .from('customer_facing_business_details')
        .select('businessName')
        .eq('shop_id', shopId)
        .maybeSingle();
      
      if (shopNameResult.data?.businessName) {
        shopName = shopNameResult.data.businessName;
      } else {
        const shopsResult = await supabase
          .from('shops')
          .select('name, shop_name, business_name')
          .eq('id', shopId)
          .maybeSingle();
        
        if (shopsResult.data) {
          shopName = shopsResult.data.name || shopsResult.data.shop_name || shopsResult.data.business_name || null;
        }
      }
    } catch (shopNameError) {
      console.error('Error getting shop name:', shopNameError);
    }

    if (error) {
      console.error('Supabase query error:', error);
      // PGRST116 means no rows found, which is fine
      if (error.code !== 'PGRST116') {
        return NextResponse.json(
          { error: 'Database query failed', details: error.message },
          { status: 500 }
        );
      }
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Shop details not found' },
        { status: 404 }
      );
    }

    // Parse the StampData JSONB column
    let stampData = null;
    let expirationType = null;
    let numberOfDaysToExpire = null;

    try {
      // StampData is JSONB, so it might already be parsed or might be a string
      if (typeof data.StampData === 'string') {
        stampData = JSON.parse(data.StampData);
      } else {
        stampData = data.StampData;
      }

      // Extract expirationType and numberOfDaysToExpire from the first item in the array
      if (Array.isArray(stampData) && stampData.length > 0) {
        const firstCard = stampData[0];
        expirationType = firstCard.expirationType || null;
        numberOfDaysToExpire = firstCard.numberOfDaysToExpire || null;
      }
    } catch (parseError) {
      console.error('Error parsing StampData:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse StampData', details: parseError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      shop_id: data.shop_id,
      expirationType,
      numberOfDaysToExpire,
      shopName,
      stampData // Include full stampdata for debugging
    });
  } catch (error) {
    console.error('Error in shop details lookup API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
