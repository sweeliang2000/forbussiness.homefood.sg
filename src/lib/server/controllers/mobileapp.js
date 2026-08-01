/**
 * PORTED from the Express backend: controllers/mobileapp.js
 *
 * Converted CommonJS -> ESM. Handler bodies are otherwise unchanged: they still
 * take (req, res) and still read req.cookies / req.body / req.files, which the
 * express-adapter shim supplies. Do not "modernise" them in place — the value of
 * this file is that it is diffable against the original.
 */

import {
  GetItemCommand,
  UpdateItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

import { getDynamo } from '../aws';
import { getSupabase } from '../supabase';

const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getSupabase();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

const client = { send: (command) => getDynamo().send(command) };

// Get all user cards
export const getAllUserCards = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_cards')
      .select('*');


    if (error) {
      return res.status(400).json({ error: error.message });
    }


    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Get a single user card by ID or by phone + shop_id
export const getUserCardById = async (req, res) => {
  try {
    const { id } = req.params;
    const { phone, shop_id } = req.query;

    // If ID is provided in URL params, use that
    if (id) {
      const { data, error } = await supabase
        .from('user_cards')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return res.status(404).json({ error: error.message });
      }

      return res.json(data);
    } 
    // Otherwise, use phone and shop_id from query params
    else if (phone && shop_id) {
      // Normalize phone number - preserve + sign
      let normalizedPhone = phone.trim();
      normalizedPhone = normalizedPhone.replace(/[\s\-\(\)]/g, '');
      
      // Try exact match first
      let { data, error } = await supabase
        .from('user_cards')
        .select('*')
        .eq('phone_number', normalizedPhone)
        .eq('shop_id', shop_id)
        .maybeSingle();
      
      // If not found with exact match, try different phone formats
      if (!data && !error) {
        // Try adding + if phone starts with 65
        if (!normalizedPhone.startsWith('+') && normalizedPhone.startsWith('65')) {
          const phoneWithPlus = '+' + normalizedPhone;
          const result = await supabase
            .from('user_cards')
            .select('*')
            .eq('phone_number', phoneWithPlus)
            .eq('shop_id', shop_id)
            .maybeSingle();
          
          if (result.data) {
            data = result.data;
          }
        }
        
        // Try without country code (if phone starts with +65)
        if (!data && normalizedPhone.startsWith('+65')) {
          const phoneWithoutCountryCode = normalizedPhone.substring(3);
          const result = await supabase
            .from('user_cards')
            .select('*')
            .eq('phone_number', phoneWithoutCountryCode)
            .eq('shop_id', shop_id)
            .maybeSingle();
          
          if (result.data) {
            data = result.data;
          }
        }
        
        // Try with just the digits
        if (!data) {
          const phoneDigits = normalizedPhone.replace(/\D/g, '');
          const result = await supabase
            .from('user_cards')
            .select('*')
            .eq('phone_number', phoneDigits)
            .eq('shop_id', shop_id)
            .maybeSingle();
          
          if (result.data) {
            data = result.data;
          }
        }
      }
      
      if (error && !data) {
        return res.status(500).json({ 
          error: 'Database query failed',
          details: error.message 
        });
      }
      
      if (!data) {
        return res.status(404).json({ error: 'User card not found' });
      }
      
      return res.json(data);
    } else {
      return res.status(400).json({ 
        error: 'Either id (in URL) or phone + shop_id (in query) is required' 
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Create a new user card
export const createUserCard = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_cards')
      .insert([req.body])
      .select()
      .single();


    if (error) {
      return res.status(400).json({ error: error.message });
    }


    res.status(201).json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Update a user card by ID or by phone + shop_id
export const updateUserCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { phone, shop_id } = req.query;

    let updateQuery;

    // If ID is provided in URL params, use that
    if (id) {
      updateQuery = supabase
        .from('user_cards')
        .update(req.body)
        .eq('id', id)
        .select()
        .single();
    } 
    // Otherwise, use phone and shop_id from query params
    else if (phone && shop_id) {
      // Normalize phone number - preserve + sign
      let normalizedPhone = phone.trim();
      normalizedPhone = normalizedPhone.replace(/[\s\-\(\)]/g, '');
      
      // Try to find the card first
      let cardData;
      let { data: foundCard, error: findError } = await supabase
        .from('user_cards')
        .select('id')
        .eq('phone_number', normalizedPhone)
        .eq('shop_id', shop_id)
        .maybeSingle();
      
      // If not found with exact match, try different phone formats
      if (!foundCard && !findError) {
        // Try adding + if phone starts with 65
        if (!normalizedPhone.startsWith('+') && normalizedPhone.startsWith('65')) {
          const phoneWithPlus = '+' + normalizedPhone;
          const result = await supabase
            .from('user_cards')
            .select('id')
            .eq('phone_number', phoneWithPlus)
            .eq('shop_id', shop_id)
            .maybeSingle();
          
          if (result.data) {
            foundCard = result.data;
          }
        }
        
        // Try without country code (if phone starts with +65)
        if (!foundCard && normalizedPhone.startsWith('+65')) {
          const phoneWithoutCountryCode = normalizedPhone.substring(3);
          const result = await supabase
            .from('user_cards')
            .select('id')
            .eq('phone_number', phoneWithoutCountryCode)
            .eq('shop_id', shop_id)
            .maybeSingle();
          
          if (result.data) {
            foundCard = result.data;
          }
        }
        
        // Try with just the digits
        if (!foundCard) {
          const phoneDigits = normalizedPhone.replace(/\D/g, '');
          const result = await supabase
            .from('user_cards')
            .select('id')
            .eq('phone_number', phoneDigits)
            .eq('shop_id', shop_id)
            .maybeSingle();
          
          if (result.data) {
            foundCard = result.data;
          }
        }
      }
      
      if (findError && !foundCard) {
        return res.status(500).json({ 
          error: 'Database query failed',
          details: findError.message 
        });
      }
      
      if (!foundCard) {
        return res.status(404).json({ error: 'User card not found' });
      }
      
      // Update using the found card ID
      updateQuery = supabase
        .from('user_cards')
        .update(req.body)
        .eq('id', foundCard.id)
        .select()
        .single();
    } else {
      return res.status(400).json({ 
        error: 'Either id (in URL) or phone + shop_id (in query) is required' 
      });
    }

    // Execute update
    const { data, error } = await updateQuery;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'User card not found' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Get user rewards filtered by phone, shop_id, and status='Collected'
export const getUserRewards = async (req, res) => {
  try {
    // Get shop_id from cookie
    const cookie = req.cookies.userDataHTTP;
    
    if (!cookie) {
      return res.status(400).json({
        error: 'Missing userDataHTTP cookie'
      });
    }

    let userData;
    try {
      userData = JSON.parse(cookie);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid cookie data'
      });
    }

    const shop_id = userData.shop_id;

    if (!shop_id) {
      return res.status(400).json({
        error: 'shop_id not found in cookie'
      });
    }

    // Get phone from query parameter
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Normalize phone number - remove spaces, dashes, parentheses
    // NOTE: If the frontend sends "+659..." without encoding "+", Express may give " 659..."
    // This normalization removes that space so we still get "659..."
    let normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    console.log('Original phone from query:', phone);
    console.log('Normalized phone:', normalizedPhone, 'shop_id:', shop_id, 'status: Collected');

    // Current time for expiry check (server time; if expiry_date is stored in UTC, this comparison is correct)
    const nowForExpiry = new Date().toISOString();

    // Build query for user_rewards table with SQL filters
    // Filter by phone_number, shop_id, status = 'Collected', and reward not expired (expiry_date null or >= now)
    let query = supabase
      .from('user_rewards')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('shop_id', shop_id)
      .eq('status', 'Collected')
      .or(`expiry_date.is.null,expiry_date.gte.${nowForExpiry}`);

    // Execute query
    let { data, error } = await query;
    
    console.log('Initial query result:', { dataCount: data?.length, error: error?.message, sampleData: data?.[0] });

    if (error) {
      console.error('Supabase query error:', error);
      // Don't return error immediately, try alternative phone formats first
    }

    // If not found with exact match, try different phone formats
    if ((!data || data.length === 0) && !error) {
      // If number starts with 65 and is missing '+', try with '+'
      if (!normalizedPhone.startsWith('+') && normalizedPhone.startsWith('65')) {
        const phoneWithPlus = '+' + normalizedPhone;
        console.log('Trying phone with + prefix:', phoneWithPlus);
        let plusQuery = supabase
          .from('user_rewards')
          .select('*')
          .eq('phone_number', phoneWithPlus)
          .eq('shop_id', shop_id)
          .eq('status', 'Collected')
          .or(`expiry_date.is.null,expiry_date.gte.${nowForExpiry}`);
        
        const plusResult = await plusQuery;
        console.log('Retry query result (with + prefix):', { dataCount: plusResult.data?.length, error: plusResult.error?.message });
        if (plusResult.data && plusResult.data.length > 0) {
          data = plusResult.data;
        }
      }

      // Try without country code (if phone starts with +65)
      if ((!data || data.length === 0) && normalizedPhone.startsWith('+65')) {
        const phoneWithoutCountryCode = normalizedPhone.substring(3);
        console.log('Trying phone without country code:', phoneWithoutCountryCode);
        let retryQuery = supabase
          .from('user_rewards')
          .select('*')
          .eq('phone_number', phoneWithoutCountryCode)
          .eq('shop_id', shop_id)
          .eq('status', 'Collected')
          .or(`expiry_date.is.null,expiry_date.gte.${nowForExpiry}`);
        
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
          .eq('shop_id', shop_id)
          .eq('status', 'Collected')
          .or(`expiry_date.is.null,expiry_date.gte.${nowForExpiry}`);
        
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
      return res.status(500).json({
        error: 'Database query failed',
        details: error.message
      });
    }

    // Debug: If no rewards found, check what's actually in the database
    if (!data || data.length === 0) {
      console.log('=== DEBUG: No rewards found. Checking database... ===');
      console.log('Query parameters used:');
      console.log('  - shop_id:', shop_id);
      console.log('  - phone formats tried:', normalizedPhone, normalizedPhone.startsWith('+65') ? normalizedPhone.substring(3) : 'N/A', normalizedPhone.replace(/\D/g, ''));
      
      // Check if ANY rewards exist for this shop_id (regardless of phone or status)
      const shopCheck = await supabase
        .from('user_rewards')
        .select('id, phone_number, shop_id, status')
        .eq('shop_id', shop_id)
        .limit(5);
      console.log(`Total rewards in database for shop_id ${shop_id}:`, shopCheck.data?.length || 0);
      if (shopCheck.data && shopCheck.data.length > 0) {
        console.log('Sample phone numbers in database for this shop:', shopCheck.data.map(r => r.phone_number));
        console.log('Sample statuses in database for this shop:', [...new Set(shopCheck.data.map(r => r.status))]);
      }
      
      // Check with exact phone number (any status)
      const phoneCheck = await supabase
        .from('user_rewards')
        .select('id, phone_number, shop_id, status')
        .eq('phone_number', normalizedPhone)
        .eq('shop_id', shop_id);
      console.log(`Rewards found with exact phone '${normalizedPhone}' and shop_id '${shop_id}':`, phoneCheck.data?.length || 0);
      if (phoneCheck.data && phoneCheck.data.length > 0) {
        console.log('Found rewards with statuses:', phoneCheck.data.map(r => r.status));
        console.log('Sample reward:', phoneCheck.data[0]);
      }
      
      // Try with + prefix if not already tried
      if (!normalizedPhone.startsWith('+') && normalizedPhone.startsWith('65')) {
        const phoneWithPlus = '+' + normalizedPhone;
        const phoneCheck2 = await supabase
          .from('user_rewards')
          .select('id, phone_number, shop_id, status')
          .eq('phone_number', phoneWithPlus)
          .eq('shop_id', shop_id);
        console.log(`Rewards found with phone '${phoneWithPlus}' and shop_id '${shop_id}':`, phoneCheck2.data?.length || 0);
        if (phoneCheck2.data && phoneCheck2.data.length > 0) {
          console.log('Found rewards with statuses:', phoneCheck2.data.map(r => r.status));
        }
      }
      
      console.log('=== END DEBUG ===');
    }

    // Return empty array if no rewards found (not an error)
    return res.json(data || []);
  } catch (error) {
    console.error('Error in user rewards API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Update reward status to 'Redeemed'
export const updateUserReward = async (req, res) => {
  try {
    // Get shop_id and user_id from cookie
    const cookie = req.cookies.userDataHTTP;
    
    if (!cookie) {
      return res.status(400).json({
        error: 'Missing userDataHTTP cookie'
      });
    }

    let userData;
    try {
      userData = JSON.parse(cookie);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid cookie data'
      });
    }

    const shop_id = userData.shop_id;
    const performedByUserId = userData.user_id || null;
    const performedByEmail = userData.user_id || null; // user_id is the email in this system

    if (!shop_id) {
      return res.status(400).json({
        error: 'shop_id not found in cookie'
      });
    }

    const { reward_ids } = req.body;

    // Accept both reward_id (single) and reward_ids (array) for backward compatibility
    const rewardIdList = reward_ids || (req.body.reward_id ? [req.body.reward_id] : null);

    if (!rewardIdList || !Array.isArray(rewardIdList) || rewardIdList.length === 0) {
      return res.status(400).json({ error: 'reward_ids array is required and must not be empty' });
    }

    console.log('Updating reward status to Redeemed for reward_ids:', rewardIdList);

    // Get current server datetime in ISO 8601 format (UTC)
    const now = new Date().toISOString();
    
    console.log('Setting claimed_at and updated_at to:', now);

    // Update all rewards status to 'Redeemed' and set both claimed_at and updated_at to current server time
    const { data, error } = await supabase
      .from('user_rewards')
      .update({
        status: 'Redeemed',
        claimed_at: now,
        updated_at: now
      })
      .in('id', rewardIdList)
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({
        error: 'Database update failed',
        details: error.message
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No rewards found with the provided reward_ids' });
    }

    // Log each reward redemption to terminal_logs
    const logPromises = data.map(async (reward) => {
      try {
        const normalizedPhone = reward.phone_number?.replace(/[\s\-\(\)]/g, '') || '';
        const { data: userCard } = await supabase
          .from('user_cards')
          .select('id')
          .eq('shop_id', shop_id) // Get from cookie
          .eq('phone_number', normalizedPhone)
          .maybeSingle();

        // Log to terminal_logs with reward_collection transaction type
        // Use shop_id from cookie (authenticated user's shop) instead of from reward data
        const { error: logError } = await supabase
          .from('terminal_logs')
          .insert({
            shop_id: shop_id, // Get from cookie
            phone_number: normalizedPhone,
            user_card_id: userCard?.id || null,
            transaction_type: 'reward_collection',
            stamps_amount: null, // Reward redemption doesn't change stamps
            reward_id: reward.id,
            reward_name: reward.reward_name || null,
            reward_description: reward.reward_description || null,
            performed_by: performedByUserId,
            performed_by_name: performedByEmail,
            notes: null,
            created_at: now
          });

        if (logError) {
          console.error(`Error logging reward redemption for reward_id ${reward.id} to terminal_logs:`, logError);
          // Don't fail the request if logging fails, just log the error
        }
      } catch (logErr) {
        console.error(`Error logging reward redemption for reward_id ${reward.id}:`, logErr);
        // Don't fail the request if logging fails
      }
    });

    // Wait for all logs to complete (but don't fail if logging fails)
    await Promise.allSettled(logPromises);

    // Increment qr_reward_redeemed_count (DynamoDB): shop_id (PK), date (SK), columns = reward_id|reward_name, value +1 per redemption
    const dateStr = now.slice(0, 10); // YYYY-MM-DD
    const rewardKeyCounts = {};
    for (const reward of data) {
      const rewardId = (reward.reward_type_id != null && reward.reward_type_id !== '')
        ? String(reward.reward_type_id)
        : (reward.reward_id != null && reward.reward_id !== '' && reward.reward_id !== reward.id)
          ? String(reward.reward_id)
          : (reward.id != null ? String(reward.id) : 'unknown');
      const rewardName = (reward.reward_name != null && String(reward.reward_name).trim() !== '')
        ? String(reward.reward_name).trim().replace(/\|/g, '_').slice(0, 200)
        : 'unknown';
      const key = `${rewardId}|${rewardName}`;
      rewardKeyCounts[key] = (rewardKeyCounts[key] || 0) + 1;
    }
    if (Object.keys(rewardKeyCounts).length > 0) {
      try {
        const names = {};
        const values = {};
        const addParts = [];
        Object.entries(rewardKeyCounts).forEach(([attrName, count], i) => {
          const placeholder = `#r${i}`;
          const valuePlaceholder = `:v${i}`;
          names[placeholder] = attrName;
          values[valuePlaceholder] = { N: String(count) };
          addParts.push(`${placeholder} ${valuePlaceholder}`);
        });
        await client.send(new UpdateItemCommand({
          TableName: 'qr_reward_redeemed_count',
          Key: {
            shop_id: { S: String(shop_id) },
            date: { S: dateStr },
          },
          UpdateExpression: 'ADD ' + addParts.join(', '),
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
        }));
        console.log('qr_reward_redeemed_count updated for shop_id', shop_id, 'date', dateStr, 'rewards', rewardKeyCounts);
      } catch (dynamoErr) {
        console.error('qr_reward_redeemed_count update failed (non-fatal):', dynamoErr.message);
      }
    }

    console.log(`Reward status updated successfully for ${data.length} reward(s):`, data);
    return res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('Error in update reward status API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Get redeemed reward counts from qr_reward_redeemed_count (shop_id from cookie, date from query/body)
export const getQrRewardRedeemedCount = async (req, res) => {
  try {
    const cookie = req.cookies.userDataHTTP;
    if (!cookie) {
      return res.status(400).json({ error: 'Missing userDataHTTP cookie' });
    }
    let userData;
    try {
      userData = JSON.parse(cookie);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid cookie data' });
    }
    const shop_id = userData.shop_id;
    if (!shop_id) {
      return res.status(400).json({ error: 'shop_id not found in cookie' });
    }
    const date = req.query.date || req.body?.date;
    if (!date || String(date).trim() === '') {
      return res.status(400).json({
        error: 'date is required',
        hint: 'Query: ?date=YYYY-MM-DD or body: { "date": "YYYY-MM-DD" }',
      });
    }
    const dateStr = String(date).trim().slice(0, 10);

    const { Item } = await client.send(new GetItemCommand({
      TableName: 'qr_reward_redeemed_count',
      Key: {
        shop_id: { S: String(shop_id) },
        date: { S: dateStr },
      },
    }));

    if (!Item) {
      return res.json({
        shop_id,
        date: dateStr,
        data: null,
      });
    }

    const data = unmarshall(Item);
    const { shop_id: _, date: __, ...counts } = data;
    return res.json({
      shop_id: data.shop_id,
      date: data.date,
      data: counts,
    });
  } catch (error) {
    console.error('Error in getQrRewardRedeemedCount:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
};

// ==================== USER PROFILES ====================
// Get customer info by phone number
export const getUserProfileByPhone = async (req, res) => {
  try {
    // Get phone_number from query parameters (for GET) or body (for POST)
    // Supports both phone_number and phone parameter names
    const phone_number = req.query.phone_number || req.query.phone || req.body.phone_number || req.body.phone;

    if (!phone_number) {
      return res.status(400).json({ 
        error: 'phone_number is required',
        hint: 'For GET: ?phone_number=+6591234567 or ?phone=+6591234567 (URL encode + as %2B)',
        hint2: 'For POST: {"phone_number": "+6591234567"} or {"phone": "+6591234567"} in request body'
      });
    }

    // Normalize phone number - remove spaces, dashes, parentheses
    // Handle URL encoding: if phone starts with digits (65...) but should have +, add it back
    let normalizedPhone = phone_number.trim();
    normalizedPhone = normalizedPhone.replace(/[\s\-\(\)]/g, '');
    
    // If phone starts with 65 but doesn't have +, add it (handles URL encoding issues)
    if (normalizedPhone.startsWith('65') && !normalizedPhone.startsWith('+65') && normalizedPhone.length > 2) {
      normalizedPhone = '+' + normalizedPhone;
    }

    // Try exact match first
    let { data, error } = await supabase
      .from('user_profiles')
      .select('name, birthday, phone_number')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    // If not found, try different phone formats
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

    if (error && !data) {
      return res.status(500).json({
        error: 'Database query failed',
        details: error.message
      });
    }

    if (!data) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    return res.json({ data });
  } catch (error) {
    console.error('Error in getUserProfileByPhone:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};


// ==================== TERMINAL LOGS ====================
// Create terminal log entry
export const createTerminalLog = async (req, res) => {
  try {
    const {
      shop_id,
      phone_number,
      user_card_id,
      transaction_type,
      stamps_amount,
      reward_id,
      reward_name,
      reward_description,
      performed_by,
      performed_by_name,
      notes
    } = req.body;

    // Validate required fields
    if (!shop_id || !phone_number || !transaction_type) {
      return res.status(400).json({
        error: 'shop_id, phone_number, and transaction_type are required'
      });
    }

    // Validate transaction_type
    const validTransactionTypes = ['stamp_collection', 'stamp_redemption', 'reward_collection', 'stamp_deduction'];
    if (!validTransactionTypes.includes(transaction_type)) {
      return res.status(400).json({
        error: `transaction_type must be one of: ${validTransactionTypes.join(', ')}`
      });
    }

    // Normalize phone number
    const normalizedPhone = phone_number.replace(/[\s\-\(\)]/g, '');

    // Get current server datetime in ISO 8601 format (UTC)
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('terminal_logs')
      .insert({
        shop_id,
        phone_number: normalizedPhone,
        user_card_id: user_card_id || null,
        transaction_type,
        stamps_amount: stamps_amount || null,
        reward_id: reward_id || null,
        reward_name: reward_name || null,
        reward_description: reward_description || null,
        performed_by: performed_by || null,
        performed_by_name: performed_by_name || null,
        notes: notes || null,
        created_at: now
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({
        error: 'Database insert failed',
        details: error.message
      });
    }

    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error in createTerminalLog:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Get shop daily unique customers from DynamoDB (today only, or date range)
export const getTodayTerminalLogs = async (req, res) => {
  try {
    const cookie = req.cookies.userDataHTTP;
    if (!cookie) {
      return res.status(400).json({ error: 'Missing userDataHTTP cookie' });
    }
    let userData;
    try {
      userData = JSON.parse(cookie);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid cookie data' });
    }
    const shop_id = userData.shop_id;
    if (!shop_id) {
      return res.status(400).json({ error: 'shop_id not found in cookie' });
    }
    const trimmedShopId = shop_id.trim();

    const start_date = req.query.start_date || req.query.startDate;
    const end_date = req.query.end_date || req.query.endDate;

    // Date range: return all items between start_date and end_date (inclusive)
    if (start_date != null && String(start_date).trim() !== '' && end_date != null && String(end_date).trim() !== '') {
      const startStr = String(start_date).trim().slice(0, 10);
      const endStr = String(end_date).trim().slice(0, 10);
      if (startStr > endStr) {
        return res.status(400).json({ error: 'start_date must be less than or equal to end_date' });
      }
      const { Items } = await client.send(new QueryCommand({
        TableName: 'shop_daily_unique_customers',
        KeyConditionExpression: 'shop_id = :sid AND #dt BETWEEN :start AND :end',
        ExpressionAttributeNames: { '#dt': 'date' },
        ExpressionAttributeValues: {
          ':sid': { S: trimmedShopId },
          ':start': { S: startStr },
          ':end': { S: endStr },
        },
      }));
      const data = (Items || []).map((item) => unmarshall(item));
      return res.json({
        success: true,
        data,
        shop_id: trimmedShopId,
        start_date: startStr,
        end_date: endStr,
      });
    }

    // Single date (default: today in UTC)
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;
    const dateParam = req.query.date;
    const dateStr = dateParam != null && String(dateParam).trim() !== ''
      ? String(dateParam).trim().slice(0, 10)
      : todayDate;

    const { Item } = await client.send(new GetItemCommand({
      TableName: 'shop_daily_unique_customers',
      Key: {
        shop_id: { S: trimmedShopId },
        date: { S: dateStr },
      },
    }));

    if (!Item) {
      return res.json({
        success: true,
        data: null,
        date: dateStr,
        shop_id: trimmedShopId,
        message: 'No data found for this date',
      });
    }

    const data = unmarshall(Item);
    return res.json({
      success: true,
      data,
      date: dateStr,
      shop_id: trimmedShopId,
    });
  } catch (error) {
    console.error('Error in getTodayTerminalLogs:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};


// ==================== LIVE SHOP DETAILS ====================
// Get shop stamp configuration
export const getShopStampDetails = async (req, res) => {
  try {
    const { shop_id } = req.query;

    if (!shop_id) {
      return res.status(400).json({ error: 'shop_id is required' });
    }

    const { data, error } = await supabase
      .from('live_shop_details')
      .select('shop_id, StampData')
      .eq('shop_id', shop_id)
      .maybeSingle();

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({
        error: 'Database query failed',
        details: error.message
      });
    }

    if (!data) {
      return res.status(404).json({ error: 'Shop stamp details not found' });
    }

    return res.json({ data });
  } catch (error) {
    console.error('Error in getShopStampDetails:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};


// ==================== CUSTOMER FACING BUSINESS DETAILS ====================
// Get business name for display
export const getBusinessName = async (req, res) => {
  try {
    const { shop_id } = req.query;

    if (!shop_id) {
      return res.status(400).json({ error: 'shop_id is required' });
    }

    // Try customer_facing_business_details first
    let { data, error } = await supabase
      .from('customer_facing_business_details')
      .select('businessName, shop_id')
      .eq('shop_id', shop_id)
      .maybeSingle();

    // If not found, fallback to shops table
    if (!data && !error) {
      const shopsResult = await supabase
        .from('shops')
        .select('name, shop_name, business_name, id')
        .eq('id', shop_id)
        .maybeSingle();

      if (shopsResult.data) {
        // Map shops table fields to businessName
        data = {
          businessName: shopsResult.data.business_name || shopsResult.data.shop_name || shopsResult.data.name,
          shop_id: shopsResult.data.id
        };
      }
    }

    if (error && !data) {
      return res.status(500).json({
        error: 'Database query failed',
        details: error.message
      });
    }

    if (!data) {
      return res.status(404).json({ error: 'Business details not found' });
    }

    return res.json({ data });
  } catch (error) {
    console.error('Error in getBusinessName:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};


// ==================== SHOPS ====================
// Get shop details (fallback for shop name)
export const getShopDetails = async (req, res) => {
  try {
    const { shop_id } = req.query;

    if (!shop_id) {
      return res.status(400).json({ error: 'shop_id is required' });
    }

    const { data, error } = await supabase
      .from('shops')
      .select('name, shop_name, business_name, id')
      .eq('id', shop_id)
      .maybeSingle();

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({
        error: 'Database query failed',
        details: error.message
      });
    }

    if (!data) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    return res.json({ data });
  } catch (error) {
    console.error('Error in getShopDetails:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};


// ==================== LIVE SHOP DETAILS - STAMP DATA ====================
// Get StampData from live_shop_details and extract isEnabled
export const getStampDataIsEnabled = async (req, res) => {
  try {
    // Get shop_id from cookie
    const cookie = req.cookies.userDataHTTP;
    
    if (!cookie) {
      return res.status(400).json({
        error: 'Missing userDataHTTP cookie'
      });
    }

    let userData;
    try {
      userData = JSON.parse(cookie);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid cookie data'
      });
    }

    const shop_id = userData.shop_id;

    if (!shop_id) {
      return res.status(400).json({
        error: 'shop_id not found in cookie'
      });
    }

    // Query live_shop_details table for StampData
    const { data, error } = await supabase
      .from('live_shop_details')
      .select('shop_id, StampData')
      .eq('shop_id', shop_id)
      .maybeSingle();

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({
        error: 'Database query failed',
        details: error.message
      });
    }

    if (!data) {
      return res.status(404).json({ error: 'Shop details not found' });
    }

    // Extract StampData and isEnabled
    let stampData = null;
    let isEnabled = null;

    if (data.StampData) {
      // Handle if it's a string (JSON) or already an object
      if (typeof data.StampData === 'string') {
        try {
          stampData = JSON.parse(data.StampData);
        } catch (parseError) {
          console.error('Error parsing StampData:', parseError);
          return res.status(500).json({
            error: 'Invalid StampData format',
            details: parseError.message
          });
        }
      } else {
        stampData = data.StampData;
      }

      // Extract isEnabled from StampData
      // Check if StampData is an array (first element) or object
      if (Array.isArray(stampData) && stampData.length > 0) {
        isEnabled = stampData[0].isEnabled || stampData[0].is_enabled || null;
      } else if (typeof stampData === 'object' && stampData !== null) {
        isEnabled = stampData.isEnabled || stampData.is_enabled || null;
      }
    }

    return res.json({
      success: true,
      data: {
        shop_id: data.shop_id,
        StampData: stampData,
        isEnabled: isEnabled
      }
    });
  } catch (error) {
    console.error('Error in getStampDataIsEnabled:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

// ==================== TERMINAL STAMPS WORKFLOW ====================
// Comprehensive stamps transaction endpoint (combines check, create/update, and logging)
export const processStampTransaction = async (req, res) => {
  try {
    // Get shop_id and email from cookie
    const cookie = req.cookies.userDataHTTP;
    
    if (!cookie) {
      return res.status(400).json({
        error: 'Missing userDataHTTP cookie'
      });
    }

    let userData;
    try {
      userData = JSON.parse(cookie);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid cookie data'
      });
    }

    const shop_id = userData.shop_id;
    const performed_by_email = userData.user_id || null; // Get email from cookie (user_id is the email)

    if (!shop_id) {
      return res.status(400).json({
        error: 'shop_id not found in cookie'
      });
    }

    const { phone_number, stamp_change } = req.body;

    // Validate required fields
    if (!phone_number || stamp_change === undefined || stamp_change === null) {
      return res.status(400).json({
        error: 'phone_number and stamp_change are required'
      });
    }

    // Normalize phone number
    const normalizedPhone = phone_number.replace(/[\s\-\(\)]/g, '');

    // Get current server datetime in UTC
    const nowUTC = new Date().toISOString();

    // Step 1: Check if user card exists
    let existingCard;
    try {
      const { data: cardData, error: cardError } = await supabase
        .from('user_cards')
        .select('id, stamps, expiry_date, created_at, updated_at')
        .eq('shop_id', shop_id)
        .eq('phone_number', normalizedPhone)
        .maybeSingle();

      // Only treat non-PGRST116 errors as actual errors
      if (cardError && cardError.code !== 'PGRST116') {
        console.error('Error checking for existing card:', cardError);
        return res.status(500).json({
          error: 'Database query failed',
          details: cardError.message
        });
      }

      existingCard = cardData;
    } catch (error) {
      console.error('Error in card existence check:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }

    // Step 2: Get shop stamp configuration (for expiry calculation if creating new card)
    let shopConfig = null;
    if (!existingCard) {
      try {
        const { data: shopData, error: shopError } = await supabase
          .from('live_shop_details')
          .select('shop_id, StampData')
          .eq('shop_id', shop_id)
          .maybeSingle();

        if (!shopError && shopData) {
          shopConfig = shopData;
        }
      } catch (error) {
        console.error('Error fetching shop config (non-blocking):', error);
        // Continue without shop config - expiry_date will be null
      }
    }

    let cardResult;
    let actualStampChange;
    let wasLimited = false;
    let transactionType;

    if (existingCard) {
      // Step 3A: UPDATE existing card
      const currentStamps = existingCard.stamps || 0;
      const requestedNewStamps = currentStamps + stamp_change;
      const newStamps = Math.max(0, requestedNewStamps);
      actualStampChange = newStamps - currentStamps;

      // Check if redemption was limited
      if (stamp_change < 0 && actualStampChange !== stamp_change) {
        wasLimited = true;
      }

      // Determine transaction type
      transactionType = actualStampChange >= 0 ? 'stamp_collection' : 'stamp_deduction';

      // Update the card
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
        return res.status(500).json({
          error: 'Failed to update card',
          details: updateError.message
        });
      }

      cardResult = updatedCard;
    } else {
      // Step 3B: CREATE new card
      // Calculate expiry date from shop configuration
      let expiryDate = null;
      if (shopConfig && shopConfig.StampData) {
        try {
          let stampData = shopConfig.StampData;
          // Handle if StampData is a string
          if (typeof stampData === 'string') {
            stampData = JSON.parse(stampData);
          }

          // Get first card configuration
          if (Array.isArray(stampData) && stampData.length > 0) {
            const firstCard = stampData[0];
            const expirationType = firstCard.expirationType;
            const numberOfDaysToExpire = firstCard.numberOfDaysToExpire;

            if (expirationType && numberOfDaysToExpire) {
              const expiry = new Date();
              expiry.setDate(expiry.getDate() + numberOfDaysToExpire);
              expiry.setHours(0, 0, 0, 0);
              expiryDate = expiry.toISOString();
            }
          }
        } catch (parseError) {
          console.error('Error parsing StampData (non-blocking):', parseError);
          // Continue with null expiry_date
        }
      }

      // Initial stamps (prevent negative)
      const initialStamps = Math.max(0, stamp_change);

      // Create new card
      const { data: newCard, error: createError } = await supabase
        .from('user_cards')
        .insert({
          shop_id: shop_id,
          phone_number: normalizedPhone,
          stamps: initialStamps,
          expiry_date: expiryDate,
          status: 'Using',
          created_at: nowUTC,
          updated_at: nowUTC,
          collected_rewards: []
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating card:', createError);
        return res.status(500).json({
          error: 'Failed to create card',
          details: createError.message
        });
      }

      cardResult = newCard;
      actualStampChange = initialStamps;
      transactionType = initialStamps >= 0 ? 'stamp_collection' : 'stamp_deduction';
    }

    // Step 4: Log transaction to terminal_logs (non-blocking)
    try {
      await supabase
        .from('terminal_logs')
        .insert({
          shop_id: shop_id,
          phone_number: normalizedPhone,
          user_card_id: cardResult.id,
          transaction_type: transactionType,
          stamps_amount: actualStampChange,
          reward_id: null,
          reward_name: null,
          reward_description: null,
          performed_by: null,
          performed_by_name: performed_by_email || null,
          notes: null,
          created_at: nowUTC
        });
    } catch (logError) {
      console.error('Error logging transaction (non-blocking):', logError);
      // Don't fail the request if logging fails
    }

    // Build response
    const response = {
      success: true,
      data: cardResult,
      transaction: {
        requestedChange: stamp_change,
        actualChange: actualStampChange,
        transactionType: transactionType
      }
    };

    // Add limitation info if applicable
    if (wasLimited) {
      response.wasLimited = true;
      response.message = `Stamps ${actualStampChange >= 0 ? 'increased' : 'decreased'} by ${Math.abs(actualStampChange)} (limited to available stamps)`;
    }

    return res.json(response);
  } catch (error) {
    console.error('Error in processStampTransaction:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

