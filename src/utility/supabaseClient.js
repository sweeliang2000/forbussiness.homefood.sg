import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '../../config/config';

// Verify configuration
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase configuration missing. Please check environment variables.');
}

// Create Supabase client with service role key for admin access
// Service role key bypasses RLS policies
// Note: This client is for reference only. The API route should be used instead for security.
export const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    })
  : null;

/**
 * Fetch customer information by phone number
 * @param {string} phoneNumber - Phone number in format +65XXXXXXXX
 * @returns {Promise<{name: string, birthday: string} | null>} Customer data or null if not found
 */
export const getCustomerByPhoneNumber = async (phoneNumber) => {
  try {
    if (!supabase) {
      throw new Error('Supabase client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.');
    }

    // Normalize phone number - remove spaces, dashes, parentheses
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    console.log('Fetching customer with phone:', normalizedPhone);
    console.log('Supabase URL:', SUPABASE_URL);
    console.log('Service role key exists:', !!SUPABASE_SERVICE_ROLE_KEY);
    
    // Query the user_profiles table
    // Table columns: phone_number, name, birthday
    // Try exact match first
    let { data, error } = await supabase
      .from('user_profiles')
      .select('name, birthday, phone_number')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();
    
    console.log('Query result:', { data, error });

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
      // Log the full error for debugging
      console.error('Supabase query error:', error);
      // If it's a 401, it might be an RLS policy issue
      if (error.message?.includes('401') || error.status === 401) {
        throw new Error('Unauthorized: Check Supabase RLS policies or service role key permissions');
      }
      // PGRST116 means no rows found, which is fine
      if (error.code !== 'PGRST116') {
        throw error;
      }
    }

    return data || null;
  } catch (error) {
    console.error('Error fetching customer:', error);
    // Re-throw to let the component handle it
    throw error;
  }
};
