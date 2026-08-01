/**
 * PORTED from the Express backend: controllers/shopSlug.js
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
  createConflictError,
  createDatabaseError,
  createExternalServiceError,
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

// 3–30 chars, lowercase letters/numbers/hyphens, no leading/trailing hyphen.
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

const RESERVED_SLUGS = new Set([
  'app', 'api', 'admin', 'shop', 'shops', 'order', 'orders', 'login', 'signup',
  'terminal', 'collbine', 'homefood', 'www', 'support', 'help', 'about', 'static', 'assets',
  'public', 'settings', 'account', 'checkout', 'cart', 'menu', 'search',
]);

const CUSTOMER_BASE_URL = process.env.CUSTOMER_BASE_URL || 'https://homefood.sg';

const isMissingSlugColumn = (error) =>
  error && (error.code === '42703' || error.code === 'PGRST204' || /slug/.test(error.message || ''));

// GET /api/data/shop-slug — the shop's current public link name.
export const getShopSlug = asyncHandler(async (req, res) => {
  if (!supabase) throw createExternalServiceError('Supabase not configured');
  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;

  const { data, error } = await supabase
    .from('shops')
    .select('slug')
    .eq('shop_id', shop_id)
    .maybeSingle();
  if (error) {
    if (isMissingSlugColumn(error)) {
      // Column not migrated yet — render the card anyway; saving surfaces the
      // actionable error.
      return res.status(200).json(createSuccessResponse('Shop slug', {
        slug: null,
        hasLiveShop: false,
        migrationNeeded: true,
        baseUrl: CUSTOMER_BASE_URL,
      }));
    }
    throw createDatabaseError('get shop slug', error, 'getShopSlug');
  }

  res.status(200).json(createSuccessResponse('Shop slug', {
    slug: data?.slug ?? null,
    hasLiveShop: !!data,
    migrationNeeded: false,
    baseUrl: CUSTOMER_BASE_URL,
  }));
});

// PUT /api/data/shop-slug  { slug } — claim or change the shop's public link name.
export const setShopSlug = asyncHandler(async (req, res) => {
  if (!supabase) throw createExternalServiceError('Supabase not configured');
  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;
  const slug = String(req.body?.slug ?? '').trim().toLowerCase();

  if (!SLUG_REGEX.test(slug)) {
    throw createValidationError('Shop link must be 3–30 characters: lowercase letters, numbers and hyphens (not at the start or end).');
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw createValidationError('This shop link name is reserved — please choose another.');
  }

  const handleWriteError = (error) => {
    if (error.code === '23505') {
      throw createValidationError('This shop link is already taken — please choose another.');
    }
    if (isMissingSlugColumn(error)) {
      throw createValidationError('Shop link columns are missing — run scripts/add-preorder-and-slug-columns.sql on the database first.');
    }
    throw createDatabaseError('set shop slug', error, 'setShopSlug');
  };

  // Claim the slug immediately: update the live shop row if it exists, otherwise
  // create a stub row holding just the claim. Everything else in the release
  // pipeline updates shops by shop_id, so the stub gets filled in on publish.
  const { data, error } = await supabase
    .from('shops')
    .update({ slug })
    .eq('shop_id', shop_id)
    .select('shop_id')
    .maybeSingle();
  if (error) handleWriteError(error);

  if (!data) {
    const { error: insertError } = await supabase
      .from('shops')
      .insert({ shop_id, slug });
    if (insertError) handleWriteError(insertError);
  }

  await recordActivity(req, { action: 'shop.slug_set', entityType: 'shop', detail: { slug } });

  res.status(200).json(createSuccessResponse('Shop link saved', { slug, baseUrl: CUSTOMER_BASE_URL }));
});

// GET /api/public/shop/:slug — PUBLIC storefront resolution (no auth). The
// customer app resolves /shop/<slug> to the live shop + menu through this.
export const getPublicShopBySlug = asyncHandler(async (req, res) => {
  if (!supabase) throw createExternalServiceError('Supabase not configured');
  const slug = String(req.params.slug ?? '').trim().toLowerCase();
  if (!SLUG_REGEX.test(slug)) throw createNotFoundError('Shop');

  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .ilike('slug', slug)
    .maybeSingle();
  if (error) throw createDatabaseError('get shop by slug', error, 'getPublicShopBySlug');
  if (!data) throw createNotFoundError('Shop');

  // Strip merchant-internal fields before exposing the menu publicly.
  const menu = data.menu ?? null;
  if (menu && Array.isArray(menu.optionGroupsLibrary)) {
    menu.optionGroupsLibrary = menu.optionGroupsLibrary.map(({ referenceName, ...group }) => group);
  }

  res.status(200).json(createSuccessResponse('Shop', {
    shopId: data.shop_id,
    slug: data.slug,
    isOpen: data.is_open !== false,
    orderMode: data.order_mode ?? null,
    orderHours: data.order_hours ?? null,
    minNoticeHours: data.min_notice_hours ?? null,
    bookingDaysAhead: data.booking_days_ahead ?? null,
    defaultDailyQuota: data.default_daily_quota ?? null,
    paymentMethod: data.payment_method ?? null,
    menu,
  }));
});
