/**
 * PORTED from the Express backend: controllers/paymentSettings.js
 *
 * Converted CommonJS -> ESM. Handler bodies are otherwise unchanged: they still
 * take (req, res) and still read req.cookies / req.body / req.files, which the
 * express-adapter shim supplies. Do not "modernise" them in place — the value of
 * this file is that it is diffable against the original.
 */

import {
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';

import {
  AppError,
  ERROR_TYPES,
  createSuccessResponse,
  createValidationError,
  createAuthorizationError,
  createDatabaseError,
  createExternalServiceError,
  asyncHandler,
} from '../errors';
import { getDynamo } from '../aws';
import { getSupabase } from '../supabase';
import { recordActivity } from './activityLog';
import { getAuthoritativeUser } from '../authoritative-user';
import { hasProEntitlement } from '../subscriptions/repository';

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

const PAYMENT_SETTINGS_TABLE = 'Payment_Settings';

const VALID_METHODS = ['manual', 'automatic'];

// Only the persistent PayNow identity is stored. Amount / reference / expiry are
// per-transaction test values entered on the client and are never persisted.
const DEFAULT_PAYNOW = {
  proxyType: 'UEN',
  uen: '',
  companyName: '',
  mobile: '',
  editableAmount: false,
};

// Normalises the manual PayNow config sent from the client.
function sanitizePayNow(input = {}) {
  if (input == null || typeof input !== 'object') return { ...DEFAULT_PAYNOW };

  return {
    proxyType: input.proxyType === 'MOBILE' ? 'MOBILE' : 'UEN',
    uen: typeof input.uen === 'string' ? input.uen.trim() : '',
    companyName: typeof input.companyName === 'string' ? input.companyName.trim() : '',
    mobile: typeof input.mobile === 'string' ? input.mobile.trim() : '',
    editableAmount: Boolean(input.editableAmount),
  };
}

// GET /api/data/paymentSettings
export const getPaymentSettings = asyncHandler(async (req, res) => {
  const { shop_id } = await getAuthoritativeUser(req);

  let response;
  try {
    response = await client.send(new GetItemCommand({
      TableName: PAYMENT_SETTINGS_TABLE,
      Key: { shopId: { S: shop_id } },
    }));
  } catch (err) {
    throw createDatabaseError('get payment settings', err, 'getPaymentSettings');
  }

  // Never-configured shops still load with sensible defaults (no 404).
  const data = response.Item
    ? unmarshall(response.Item)
    : { shopId: shop_id, paymentMethod: null, paynow: { ...DEFAULT_PAYNOW }, isChanges: false };

  if (data.isChanges === undefined) data.isChanges = false;
  if (!data.paynow) data.paynow = { ...DEFAULT_PAYNOW };
  data.isEdit = !['pending', 'scheduled_released_cancelled', 'approved_scheduled'].includes(req.releaseStatus);
  data.releaseStatus = req.releaseStatus || null;

  // Manual PayNow is Pro-only, and that rule is enforced on write below. The
  // client is told the entitlement here purely so it can present the gate up
  // front instead of letting someone fill in the whole form and then hit a
  // 403 on save. This is a hint for the UI, never the authorisation itself.
  data.isPro = await hasProEntitlement(shop_id);

  res.status(200).json(createSuccessResponse('Payment settings retrieved', data));
});

// PUT /api/data/paymentSettings
export const upsertPaymentSettings = asyncHandler(async (req, res) => {
  const { shop_id } = await getAuthoritativeUser(req);
  const { paymentMethod } = req.body;

  if (paymentMethod != null && !VALID_METHODS.includes(paymentMethod)) {
    throw createValidationError('paymentMethod must be "manual", "automatic", or null.');
  }

  const paynow = sanitizePayNow(req.body.paynow);

  // When manual is the active method, require a usable PayNow proxy.
  if (paymentMethod === 'manual') {
    if (!(await hasProEntitlement(shop_id))) {
      throw createAuthorizationError('Manual PayNow requires an active Pro subscription.');
    }
    if (paynow.proxyType === 'UEN' && !paynow.uen) {
      throw createValidationError('UEN is required for manual PayNow.');
    }
    if (paynow.proxyType === 'MOBILE' && !paynow.mobile) {
      throw createValidationError('Mobile number is required for manual PayNow.');
    }
  }

  const item = marshall({
    shopId: shop_id,
    paymentMethod: paymentMethod ?? null,
    paynow,
    updatedAt: new Date().toISOString(),
    isChanges: true,
  }, { removeUndefinedValues: true });

  try {
    await client.send(new PutItemCommand({ TableName: PAYMENT_SETTINGS_TABLE, Item: item }));
  } catch (err) {
    throw createDatabaseError('upsert payment settings', err, 'upsertPaymentSettings');
  }

  res.status(200).json(createSuccessResponse('Payment settings saved'));
});

// POST /api/data/publish/payment-settings
export const publishPaymentSettingsUpdate = asyncHandler(async (req, res) => {
  if (req.releaseStatus !== 'Released') {
    throw createAuthorizationError('Shop must be Released before publishing updates.');
  }

  const { shop_id } = await getAuthoritativeUser(req);

  const { Item } = await client.send(new GetItemCommand({
    TableName: PAYMENT_SETTINGS_TABLE,
    Key: { shopId: { S: shop_id } },
  }));

  if (!Item) {
    return res.status(200).json(createSuccessResponse('No unpublished changes', null));
  }

  const data = unmarshall(Item);

  if (data.paymentMethod === 'manual' && !(await hasProEntitlement(shop_id))) {
    throw createAuthorizationError('Manual PayNow requires an active Pro subscription.');
  }

  if (!data.isChanges) {
    return res.status(200).json(createSuccessResponse('No unpublished changes', null));
  }

  if (!supabase) throw createExternalServiceError('Supabase client not initialized');

  const supabasePayload = {
    payment_method: data.paymentMethod ?? null,
    paynow_config: data.paynow ?? null,
  };

  const { error: supabaseError } = await supabase
    .from('shops')
    .update(supabasePayload)
    .eq('shop_id', shop_id);

  if (supabaseError) {
    throw createExternalServiceError(`Supabase update failed: ${supabaseError.message}`);
  }

  await client.send(new UpdateItemCommand({
    TableName: PAYMENT_SETTINGS_TABLE,
    Key: { shopId: { S: shop_id } },
    UpdateExpression: 'SET isChanges = :false',
    ExpressionAttributeValues: { ':false': { BOOL: false } },
  }));

  await recordActivity(req, { action: 'settings.publish', entityType: 'payment_settings' });

  res.status(200).json(createSuccessResponse('Payment settings published successfully', null));
});
