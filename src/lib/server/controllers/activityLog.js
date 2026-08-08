/**
 * PORTED from the Express backend: controllers/activityLog.js
 *
 * Converted CommonJS -> ESM. Handler bodies are otherwise unchanged: they still
 * take (req, res) and still read req.cookies / req.body / req.files, which the
 * express-adapter shim supplies. Do not "modernise" them in place — the value of
 * this file is that it is diffable against the original.
 */

import {
  createDatabaseError,
  createValidationError,
  createExternalServiceError,
  createSuccessResponse,
  asyncHandler,
} from '../errors';
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

// Pull the acting user + shop from the auth cookie ({ user_id, role, shop_id }).
function actorFromReq(req) {
  try {
    const data = JSON.parse(req.cookies.userDataHTTP);
    return { shopId: data.shop_id ?? null, actorId: data.user_id ?? null, actorRole: data.role ?? null };
  } catch {
    return { shopId: null, actorId: null, actorRole: null };
  }
}

// Fire-and-forget audit write. Never throws — logging must not break the action it
// records. Call with `await recordActivity(...)` or bare; failures are logged only.
async function recordActivity(req, { action, entityType = null, entityId = null, detail = {} }) {
  if (!supabase) return;
  const { shopId, actorId, actorRole } = actorFromReq(req);
  if (!shopId || !action) return;
  try {
    const { error } = await supabase.from('activity_log').insert({
      shop_id: shopId,
      actor_id: actorId,
      actor_role: actorRole,
      action,
      entity_type: entityType,
      entity_id: entityId != null ? String(entityId) : null,
      detail: detail ?? {},
    });
    if (error && !(error.code === '42P01' || /activity_log/.test(error.message || ''))) {
      console.error('recordActivity: insert failed:', error.message);
    }
  } catch (e) {
    console.error('recordActivity: unexpected failure:', e.message);
  }
}

/**
 * Where a request came from, for the sign-in trail.
 *
 * Vercel resolves the geo headers at the edge, so there's no IP database or
 * third-party lookup involved. They're absent in local dev and on any other
 * host, which is why every field is optional and the UI has to cope with an
 * entry that only has a timestamp.
 */
export function requestOrigin(req) {
  const headers = req.headers ?? {};
  const forwarded = headers['x-forwarded-for'];

  return {
    // Left-most entry is the client; the rest are proxies.
    ip: (forwarded ? String(forwarded).split(',')[0] : headers['x-real-ip'])?.trim() || null,
    city: headers['x-vercel-ip-city'] ? decodeURIComponent(headers['x-vercel-ip-city']) : null,
    region: headers['x-vercel-ip-country-region'] || null,
    country: headers['x-vercel-ip-country'] || null,
    userAgent: headers['user-agent'] ? String(headers['user-agent']).slice(0, 400) : null
  };
}

/**
 * Audit write for an actor the cookie can't identify yet.
 *
 * recordActivity reads shop_id and actor from req.cookies.userDataHTTP, which
 * doesn't exist during sign-in — that request is what sets it. This variant
 * takes the identity explicitly, from the provisioned user.
 */
export async function recordActivityAs({ shopId, actorId, actorRole }, { action, entityType = null, entityId = null, detail = {} }) {
  if (!supabase || !shopId || !action) return;
  try {
    const { error } = await supabase.from('activity_log').insert({
      shop_id: shopId,
      actor_id: actorId ?? null,
      actor_role: actorRole ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId != null ? String(entityId) : null,
      detail: detail ?? {},
    });
    if (error && !(error.code === '42P01' || /activity_log/.test(error.message || ''))) {
      console.error('recordActivityAs: insert failed:', error.message);
    }
  } catch (e) {
    console.error('recordActivityAs: unexpected failure:', e.message);
  }
}

/**
 * GET /api/data/sign-in-history?email=&limit= — one user's recent sign-ins.
 *
 * Scoped to the caller's shop by the controller that owns authorisation; this
 * only reads rows already filtered by shop_id.
 */
export async function readSignInHistory({ shopId, actorId, limit = 20 }) {
  if (!supabase || !shopId || !actorId) return [];
  const { data, error } = await supabase
    .from('activity_log')
    .select('created_at, detail')
    .eq('shop_id', shopId)
    .eq('actor_id', actorId)
    .eq('action', 'user.login')
    .order('created_at', { ascending: false })
    .limit(Math.min(Number(limit) || 20, 100));

  if (error) {
    // A missing table is the pre-migration state, not a failure worth raising.
    if (error.code === '42P01') return [];
    console.error('readSignInHistory: query failed:', error.message);
    return [];
  }
  return data ?? [];
}

// GET /api/data/activity-log?from&to&actor&action&limit — the shop's audit trail.
export const getActivityLog = asyncHandler(async (req, res) => {
  if (!supabase) throw createExternalServiceError('Supabase not configured');
  const { shopId } = actorFromReq(req);
  const { from, to, actor, action, limit } = req.query;

  let query = supabase
    .from('activity_log')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
    .limit(Math.min(Number(limit) || 200, 500));

  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);
  if (actor) query = query.eq('actor_id', actor);
  if (action) query = query.eq('action', action);

  const { data, error } = await query;
  if (error) {
    if (error.code === '42P01' || /activity_log/.test(error.message || '')) {
      // Table not migrated yet — empty log.
      return res.status(200).json(createSuccessResponse('Activity log', { entries: [], actors: [], actions: [], migrationNeeded: true }));
    }
    throw createDatabaseError('get activity log', error, 'getActivityLog');
  }

  const entries = data ?? [];
  // Distinct actors/actions for the filter dropdowns (from the returned window).
  const actors = [...new Set(entries.map((e) => e.actor_id).filter(Boolean))];
  const actions = [...new Set(entries.map((e) => e.action).filter(Boolean))];

  res.status(200).json(createSuccessResponse('Activity log', { entries, actors, actions, migrationNeeded: false }));
});

export { recordActivity };
export { actorFromReq };
