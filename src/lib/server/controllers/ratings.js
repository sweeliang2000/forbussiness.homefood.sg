/**
 * PORTED from the Express backend: controllers/ratings.js
 *
 * Converted CommonJS -> ESM. Handler bodies are otherwise unchanged: they still
 * take (req, res) and still read req.cookies / req.body / req.files, which the
 * express-adapter shim supplies. Do not "modernise" them in place — the value of
 * this file is that it is diffable against the original.
 */

import {
  AppError,
  createSuccessResponse,
  createValidationError,
  createNotFoundError,
  createDatabaseError,
  asyncHandler,
} from '../errors';
import { getSupabase } from '../supabase';
import { recordActivity } from './activityLog';

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

const shopIdFromReq = (req) => JSON.parse(req.cookies.userDataHTTP).shop_id;

const isMissingTable = (error) => error && (error.code === '42P01' || /shop_ratings/.test(error.message || ''));

const emptyPayload = { ratings: [], count: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };

// GET /api/data/ratings — the shop's reviews + aggregate summary.
export const getRatings = asyncHandler(async (req, res) => {
  if (!supabase) throw createExternalServiceError('Supabase not configured');
  const shop_id = shopIdFromReq(req);

  // Only publicly-visible reviews reach the merchant page (and its aggregates):
  // approved now, OR still pending but older than the 3-day auto-approve window.
  // Pending-but-recent and rejected reviews are excluded.
  const cutoffIso = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const visibilityFilter = `status.eq.approved,and(status.eq.pending,submitted_at.lte.${cutoffIso})`;

  let { data, error } = await supabase
    .from('shop_ratings')
    .select('*')
    .eq('shop_id', shop_id)
    .or(visibilityFilter)
    .order('created_at', { ascending: false });
  if (error && (error.code === '42703' || /status|submitted_at/.test(error.message || ''))) {
    // Moderation columns not migrated yet (006_shop_ratings_moderation.sql) —
    // fall back to the legacy "show all" behavior.
    ({ data, error } = await supabase
      .from('shop_ratings')
      .select('*')
      .eq('shop_id', shop_id)
      .order('created_at', { ascending: false }));
  }
  if (error) {
    if (isMissingTable(error)) {
      return res.status(200).json(createSuccessResponse('Ratings', { ...emptyPayload, migrationNeeded: true }));
    }
    throw createDatabaseError('get ratings', error, 'getRatings');
  }

  const ratings = data ?? [];
  const count = ratings.length;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of ratings) {
    const n = Math.min(5, Math.max(1, Number(r.rating) || 0));
    distribution[n] += 1;
    sum += n;
  }
  const average = count ? Math.round((sum / count) * 10) / 10 : 0;

  res.status(200).json(createSuccessResponse('Ratings', {
    ratings,
    count,
    average,
    distribution,
    migrationNeeded: false,
  }));
});

// PUT /api/data/ratings/:id/response  { response } — merchant reply to a review.
export const replyToRating = asyncHandler(async (req, res) => {
  if (!supabase) throw createExternalServiceError('Supabase not configured');
  const shop_id = shopIdFromReq(req);
  const { id } = req.params;
  const response = String(req.body?.response ?? '').trim();

  if (!response) throw createValidationError('Response text is required.');

  const { data, error } = await supabase
    .from('shop_ratings')
    .update({ response, response_at: new Date().toISOString() })
    .eq('id', id)
    .eq('shop_id', shop_id)
    .select('id')
    .maybeSingle();
  if (error) {
    if (isMissingTable(error)) {
      throw createValidationError('Ratings table is missing — run scripts/add-ratings-and-activity.sql on the database first.');
    }
    throw createDatabaseError('reply to rating', error, 'replyToRating');
  }
  if (!data) throw createNotFoundError('Review');

  await recordActivity(req, { action: 'rating.reply', entityType: 'rating', entityId: id });

  res.status(200).json(createSuccessResponse('Reply saved'));
});
