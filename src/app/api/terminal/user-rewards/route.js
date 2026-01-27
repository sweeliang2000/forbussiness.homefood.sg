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

    // Get user data from cookies (email and ID)
    const userData = getUserDataFromRequest(request);
    const performedByUserId = userData?.user_id || null;
    const performedByEmail = userData?.email || null;

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

    // Log reward redemption to terminal_logs
    // Get user_card_id from user_cards table using phone_number and shop_id
    try {
      const normalizedPhone = data.phone_number?.replace(/[\s\-\(\)]/g, '') || '';
      const { data: userCard } = await supabase
        .from('user_cards')
        .select('id')
        .eq('shop_id', data.shop_id)
        .eq('phone_number', normalizedPhone)
        .maybeSingle();

      // Log to terminal_logs with reward_collection transaction type
      // Valid transaction_type values: 'stamp_collection', 'stamp_redemption', 'reward_collection', 'stamp_deduction'
      const { error: logError } = await supabase
        .from('terminal_logs')
        .insert({
          shop_id: data.shop_id,
          phone_number: normalizedPhone,
          user_card_id: userCard?.id || null,
          transaction_type: 'reward_collection',
          stamps_amount: null, // Reward redemption doesn't change stamps
          reward_id: data.id,
          reward_name: data.reward_name || null,
          reward_description: data.reward_description || null,
          performed_by: performedByUserId,
          performed_by_name: performedByEmail,
          notes: null,
          created_at: now
        });

      if (logError) {
        console.error('Error logging reward redemption to terminal_logs:', logError);
        // Don't fail the request if logging fails, just log the error
      }
    } catch (logErr) {
      console.error('Error logging reward redemption:', logErr);
      // Don't fail the request if logging fails
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
