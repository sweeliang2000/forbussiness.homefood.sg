import 'server-only';

import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client, service-role.
 *
 * This key bypasses Row Level Security, so it must never reach the browser —
 * hence `server-only` above, which turns an accidental client-component import
 * into a build failure rather than a silent bundle leak.
 *
 * Replaces the old backend's config/supabase.js, which constructed the client at
 * module load and exported `null` when env was missing, forcing every caller to
 * guard with `if (!supabase) throw ...`. Lazy construction lets us throw a real
 * error at the point of use instead.
 */

const cache = (globalThis.__homefoodSupabase ??= {});

export function getSupabase() {
  if (cache.client) return cache.client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set');
  }

  cache.client = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cache.client;
}
