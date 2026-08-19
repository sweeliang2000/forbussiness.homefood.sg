/**
 * PORTED from the Express backend: controllers/orderingSettings.js
 *
 * Converted CommonJS -> ESM. Handler bodies are otherwise unchanged: they still
 * take (req, res) and still read req.cookies / req.body / req.files, which the
 * express-adapter shim supplies. Do not "modernise" them in place — the value of
 * this file is that it is diffable against the original.
 */

import {
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  DeleteItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';

import {
  AppError,
  ERROR_TYPES,
  createSuccessResponse,
  createValidationError,
  createDatabaseError,
  createExternalServiceError,
  asyncHandler,
} from '../errors';
import { getDynamo } from '../aws';
import { getSupabase } from '../supabase';
import { recordActivity } from './activityLog';
import {
  DEFAULT_DELIVERY,
  normalizeDelivery,
  validateDelivery,
} from '@/utility/deliveryZones';

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

const ORDER_SETTINGS_TABLE = 'Order_Settings';
const CALENDAR_OVERRIDE_TABLE = 'Order_Calendar_Override';

const DEFAULT_ORDER_SETTINGS = {
  hours: [
    { enabled: false, open: '09:00', close: '22:00' },
    { enabled: true, open: '09:00', close: '22:00' },
    { enabled: true, open: '09:00', close: '22:00' },
    { enabled: true, open: '09:00', close: '22:00' },
    { enabled: true, open: '09:00', close: '22:00' },
    { enabled: true, open: '09:00', close: '22:00' },
    { enabled: true, open: '10:00', close: '23:00' },
  ],
  orderMode: 'today_and_preorder',
  defaultDailyQuota: 50,
  bookingDaysAhead: 90,
  // A day's notice: enough for a home kitchen to shop and prep for a
  // pre-order. Shops that turn work around faster can lower it to 0.5.
  minNoticeHours: 24,
  delivery: { ...DEFAULT_DELIVERY },
  isChanges: false,
};

// GET /api/data/orderingSettings
export const getOrderSettings = asyncHandler(async (req, res) => {
  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;

  const params = {
    TableName: ORDER_SETTINGS_TABLE,
    Key: { shopId: { S: shop_id } },
  };

  let response;
  try {
    response = await client.send(new GetItemCommand(params));
  } catch (err) {
    throw createDatabaseError('get order settings', err, 'getOrderSettings');
  }

  const data = response.Item
    ? unmarshall(response.Item)
    : { ...DEFAULT_ORDER_SETTINGS };
  if (data.isChanges === undefined) data.isChanges = false;
  // Records written before delivery existed have no `delivery` key at all, so
  // normalise on read rather than making every consumer handle the gap.
  data.delivery = normalizeDelivery(data.delivery);
  data.isEdit = !["pending", "scheduled_released_cancelled"].includes(req.releaseStatus);
  data.releaseStatus = req.releaseStatus || null;
  res.status(200).json(createSuccessResponse(
    response.Item ? 'Order settings retrieved' : 'No saved order settings; defaults returned',
    data
  ));
});

// PUT /api/data/orderingSettings
export const upsertOrderSettings = asyncHandler(async (req, res) => {
  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;
  const { hours, orderMode, defaultDailyQuota, bookingDaysAhead, minNoticeHours } = req.body;

  // Delivery is validated with the same module the merchant console uses to
  // price the test lookup, so the console can never accept something the API
  // would reject.
  const delivery = normalizeDelivery(req.body.delivery);
  const deliveryErrors = validateDelivery(delivery);
  if (deliveryErrors.length) {
    throw createValidationError(deliveryErrors.join(' '));
  }

  if (!hours || !Array.isArray(hours) || hours.length !== 7) {
    throw createValidationError('hours must be an array of 7 day objects');
  }
  if (!orderMode || !['today_only', 'today_and_preorder', 'preorder_only'].includes(orderMode)) {
    throw createValidationError('orderMode must be "today_only", "today_and_preorder" or "preorder_only"');
  }
  if (defaultDailyQuota == null || defaultDailyQuota < 1) {
    throw createValidationError('defaultDailyQuota must be at least 1');
  }
  if (bookingDaysAhead == null || bookingDaysAhead < 1 || bookingDaysAhead > 90) {
    throw createValidationError('bookingDaysAhead must be between 1 and 90');
  }
  if (minNoticeHours == null || minNoticeHours < 0.5) {
    throw createValidationError('minNoticeHours must be at least 0.5');
  }

  const item = marshall({
    shopId: shop_id,
    hours,
    orderMode,
    defaultDailyQuota,
    bookingDaysAhead,
    minNoticeHours,
    delivery,
    updatedAt: new Date().toISOString(),
    isChanges: true,
  });

  try {
    await client.send(new PutItemCommand({ TableName: ORDER_SETTINGS_TABLE, Item: item }));
  } catch (err) {
    throw createDatabaseError('upsert order settings', err, 'upsertOrderSettings');
  }

  res.status(200).json(createSuccessResponse('Order settings saved'));
});

// PUT /api/data/delivery-enabled
//
// The on/off switch, split out of the settings blob above.
//
// Two reasons it is its own endpoint. First, permissions: an Operator may flip
// delivery but may not touch ordering hours, and both travel in one payload
// through upsertOrderSettings, so the only way to grant one without the other
// is a route that can only do the one. Second, and the reason this applies to
// every role: upsertOrderSettings writes a *draft* that reaches customers only
// on publish, and "we've stopped delivering" is not something a shop should
// have to publish. So this writes through to the storefront immediately, the
// way shop-open and sold-out already do. Delivery pricing and zones stay on the
// draft-then-publish path — they are content, this is a switch.
export const setDeliveryEnabled = asyncHandler(async (req, res) => {
  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;
  const { enabled } = req.body || {};

  if (typeof enabled !== 'boolean') {
    throw createValidationError('enabled must be a boolean');
  }

  let existing = null;
  try {
    const { Item } = await client.send(new GetItemCommand({
      TableName: ORDER_SETTINGS_TABLE,
      Key: { shopId: { S: shop_id } },
    }));
    existing = Item ? unmarshall(Item) : null;
  } catch (err) {
    throw createDatabaseError('get order settings', err, 'setDeliveryEnabled');
  }

  const delivery = normalizeDelivery({ ...(existing?.delivery ?? DEFAULT_DELIVERY), enabled });

  // Live first: if the storefront update fails there is nothing worth writing
  // to the draft, and a draft that claims delivery is off while customers can
  // still order it is the one state this must never leave behind.
  const { error: liveError } = await supabase
    .from('shops')
    .update({ delivery_enabled: delivery.enabled, delivery_settings: delivery })
    .eq('shop_id', shop_id);

  if (liveError) {
    throw createDatabaseError('set delivery enabled', liveError, 'setDeliveryEnabled');
  }

  // Then the draft, so the console shows the new value and — more importantly —
  // so the next publish of the settings page does not put it back.
  const next = {
    ...(existing ?? { ...DEFAULT_ORDER_SETTINGS }),
    shopId: shop_id,
    delivery,
    updatedAt: new Date().toISOString(),
    // Deliberately carried over rather than set: this endpoint publishes
    // itself, so it must not light up the "unpublished changes" banner.
    isChanges: existing?.isChanges ?? false,
  };

  try {
    await client.send(new PutItemCommand({
      TableName: ORDER_SETTINGS_TABLE,
      Item: marshall(next, { removeUndefinedValues: true }),
    }));
  } catch (err) {
    throw createDatabaseError('save order settings', err, 'setDeliveryEnabled');
  }

  await recordActivity(req, {
    action: enabled ? 'delivery.on' : 'delivery.off',
    entityType: 'shop',
    detail: { enabled },
  });

  res.status(200).json(createSuccessResponse(
    enabled ? 'Delivery turned on' : 'Delivery turned off',
    { enabled }
  ));
});

// GET /api/data/calendarOverrides?year=2026&month=5
export const getCalendarOverrides = asyncHandler(async (req, res) => {
  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;
  const { year, month } = req.query;

  if (!year || !month) {
    throw createValidationError('year and month query params are required');
  }

  const paddedMonth = String(month).padStart(2, '0');
  const prefix = `${year}-${paddedMonth}`;

  const params = {
    TableName: CALENDAR_OVERRIDE_TABLE,
    KeyConditionExpression: 'shopId = :shopId AND begins_with(#date, :prefix)',
    ExpressionAttributeNames: { '#date': 'date' },
    ExpressionAttributeValues: {
      ':shopId': { S: shop_id },
      ':prefix': { S: prefix },
    },
  };

  let response;
  try {
    response = await client.send(new QueryCommand(params));
  } catch (err) {
    throw createDatabaseError('get calendar overrides', err, 'getCalendarOverrides');
  }

  const overrides = {};
  (response.Items || []).forEach((item) => {
    const record = unmarshall(item);
    overrides[record.date] = {
      status: record.status,
      useDefaultQuota: record.useDefaultQuota,
      quota: record.quota ?? null,
      reason: record.reason ?? '',
    };
  });

  res.status(200).json(createSuccessResponse('Calendar overrides retrieved', overrides));
});

// PUT /api/data/calendarOverride
export const upsertCalendarOverride = asyncHandler(async (req, res) => {
  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;
  const { date, status, useDefaultQuota, quota, reason } = req.body;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createValidationError('date must be in YYYY-MM-DD format');
  }
  if (!status || !['open', 'closed'].includes(status)) {
    throw createValidationError('status must be "open" or "closed"');
  }
  if (useDefaultQuota == null) {
    throw createValidationError('useDefaultQuota is required');
  }
  if (!useDefaultQuota && (quota == null || quota < 0)) {
    throw createValidationError('quota must be provided and non-negative when useDefaultQuota is false');
  }

  const record = {
    shopId: shop_id,
    date,
    status,
    useDefaultQuota: Boolean(useDefaultQuota),
  };
  if (!useDefaultQuota) record.quota = quota;
  if (status === 'closed' && reason) record.reason = reason;

  try {
    await client.send(new PutItemCommand({
      TableName: CALENDAR_OVERRIDE_TABLE,
      Item: marshall(record),
    }));
  } catch (err) {
    throw createDatabaseError('upsert calendar override', err, 'upsertCalendarOverride');
  }

  // Mirror the override into Supabase so the customer storefront backend
  // (Collbine-Mobile-BE) can read closed days / per-date quota without DynamoDB
  // access. Best-effort: a mirror hiccup must not fail the merchant's save — the
  // merchant can re-save, and the shop's default_daily_quota still applies.
  if (supabase) {
    const { error: mirrorError } = await supabase
      .from('order_calendar_overrides')
      .upsert(
        {
          shop_id,
          date,
          status,
          use_default_quota: Boolean(useDefaultQuota),
          quota: useDefaultQuota ? null : quota,
          reason: status === 'closed' ? (reason || null) : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'shop_id,date' }
      );
    if (mirrorError) {
      console.error('upsertCalendarOverride: Supabase mirror failed:', mirrorError.message);
    }
  }

  res.status(200).json(createSuccessResponse('Calendar override saved'));
});

// DELETE /api/data/calendarOverride?date=2026-05-15
export const deleteCalendarOverride = asyncHandler(async (req, res) => {
  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;
  const { date } = req.query;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createValidationError('date query param must be in YYYY-MM-DD format');
  }

  try {
    await client.send(new DeleteItemCommand({
      TableName: CALENDAR_OVERRIDE_TABLE,
      Key: { shopId: { S: shop_id }, date: { S: date } },
    }));
  } catch (err) {
    throw createDatabaseError('delete calendar override', err, 'deleteCalendarOverride');
  }

  // Remove the Supabase mirror row too (best-effort — see upsertCalendarOverride).
  if (supabase) {
    const { error: mirrorError } = await supabase
      .from('order_calendar_overrides')
      .delete()
      .eq('shop_id', shop_id)
      .eq('date', date);
    if (mirrorError) {
      console.error('deleteCalendarOverride: Supabase mirror delete failed:', mirrorError.message);
    }
  }

  res.status(200).json(createSuccessResponse('Calendar override deleted'));
});

// POST /api/data/publish/shop-settings
export const publishOrderingSettingsUpdate = asyncHandler(async (req, res) => {
  if (req.releaseStatus !== 'Released') {
    throw createAuthorizationError('Shop must be Released before publishing updates.');
  }

  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;

  const { Item } = await client.send(new GetItemCommand({
    TableName: ORDER_SETTINGS_TABLE,
    Key: { shopId: { S: shop_id } },
  }));

  if (!Item) {
    return res.status(200).json(createSuccessResponse('No unpublished changes', null));
  }

  const data = unmarshall(Item);

  if (!data.isChanges) {
    return res.status(200).json(createSuccessResponse('No unpublished changes', null));
  }

  if (!supabase) throw createExternalServiceError('Supabase client not initialized');

  const delivery = normalizeDelivery(data.delivery);

  const supabasePayload = {
    order_mode:          data.orderMode          ?? null,
    min_notice_hours:    data.minNoticeHours     ?? null,
    booking_days_ahead:  data.bookingDaysAhead   ?? null,
    default_daily_quota: data.defaultDailyQuota  ?? null,
    order_hours:         data.hours              ?? null,
    // Kept as one jsonb blob so the pricing shape can change without a
    // migration, plus a flat boolean so the storefront can filter shops that
    // deliver without unpacking the json.
    delivery_enabled:    delivery.enabled,
    delivery_settings:   delivery,
  };

  const { error: supabaseError } = await supabase
    .from('shops')
    .update(supabasePayload)
    .eq('shop_id', shop_id);

  if (supabaseError) {
    throw createDatabaseError('publish ordering settings', supabaseError, 'publishOrderingSettingsUpdate');
  }

  await client.send(new UpdateItemCommand({
    TableName: ORDER_SETTINGS_TABLE,
    Key: { shopId: { S: shop_id } },
    UpdateExpression: 'SET isChanges = :false',
    ExpressionAttributeValues: { ':false': { BOOL: false } },
  }));

  await recordActivity(req, { action: 'settings.publish', entityType: 'ordering_settings' });

  res.status(200).json(createSuccessResponse('Ordering settings published successfully', null));
});
