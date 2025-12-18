import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Get Supabase configuration from environment variables (server-side only)
// Note: Service role key should use SUPABASE_SERVICE_ROLE_KEY (not NEXT_PUBLIC_*) for security
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

// Validate configuration with detailed logging
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
    const phoneNumber = searchParams.get('phone');

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Normalize phone number - remove spaces, dashes, parentheses
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Query the user_profiles table
    // Try exact match first
    let { data, error } = await supabase
      .from('user_profiles')
      .select('name, birthday, phone_number')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    // If not found, try with different formats
    if (!data && !error) {
      // Try without country code (if phone starts with +65)
      if (normalizedPhone.startsWith('+65')) {
        const phoneWithoutCountryCode = normalizedPhone.substring(3);
        const result = await supabase
          .from('user_profiles')
          .select('name, birthday, phone_number')
          .eq('phone_number', phoneWithoutCountryCode)
          .maybeSingle();
        if (result.data) {
          data = result.data;
        }
      }
      
      // Try with just the digits
      if (!data) {
        const phoneDigits = normalizedPhone.replace(/\D/g, '');
        const result = await supabase
          .from('user_profiles')
          .select('name, birthday, phone_number')
          .eq('phone_number', phoneDigits)
          .maybeSingle();
        if (result.data) {
          data = result.data;
        }
      }
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
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in customer lookup API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
