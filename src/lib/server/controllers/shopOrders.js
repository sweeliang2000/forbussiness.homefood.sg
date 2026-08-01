/**
 * PORTED from the Express backend: controllers/shopOrders.js
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

const ORDER_SCREENSHOTS_BUCKET = 'order-screenshots';
// Statuses a merchant can move an order into from the queue.
const ALLOWED_STATUS = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

// Manual PayNow orders carry a synthetic "manual_"-prefixed stripe_session_id;
// walk-in (in-store) orders use "walkin_<payment-method>_". Legacy walk-in rows
// used only "walkin_<uuid>" and still resolve to the generic "walkin" method.
function isManualSession(sessionId) {
  return String(sessionId || '').startsWith('manual_');
}
function isWalkinSession(sessionId) {
  return String(sessionId || '').startsWith('walkin_');
}
function derivePaymentMethod(sessionId) {
  if (isManualSession(sessionId)) return 'manual';
  const walkinMatch = String(sessionId || '').match(/^walkin_(credit_card|paynow|cash|other)_/);
  if (walkinMatch) return walkinMatch[1];
  if (isWalkinSession(sessionId)) return 'walkin';
  return 'automatic';
}

// Signed URL (1h) for a manual order's uploaded payment screenshot, if any.
async function signScreenshot(order) {
  if (!supabase) return null;
  if (!isManualSession(order.stripe_session_id)) return null;
  if (order.payment_status !== 'screenshot_uploaded') return null;
  try {
    const { data, error } = await supabase.storage
      .from(ORDER_SCREENSHOTS_BUCKET)
      .createSignedUrl(`${order.user_uid}/${order.id}.jpg`, 3600);
    if (error) return null;
    return data?.signedUrl || null;
  } catch {
    return null;
  }
}

// GET /api/data/shop-orders?from=ISO&to=ISO — the shop's orders in a date range.
// An order's *relevant day* is its scheduled_for (pre-orders) or created_at, so
// pre-orders surface in the queue on their fulfillment day.
export const getShopOrders = asyncHandler(async (req, res) => {
  if (!supabase) throw createExternalServiceError('Supabase not configured');
  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;
  const { from, to } = req.query;

  const buildQuery = (useScheduled) => {
    let query = supabase.from('orders').select('*').eq('shop_id', shop_id);
    if (useScheduled && (from || to)) {
      const sched = [from && `scheduled_for.gte.${from}`, to && `scheduled_for.lte.${to}`].filter(Boolean).join(',');
      const created = ['scheduled_for.is.null', from && `created_at.gte.${from}`, to && `created_at.lte.${to}`]
        .filter(Boolean)
        .join(',');
      query = query.or(`and(${sched}),and(${created})`);
    } else {
      if (from) query = query.gte('created_at', from);
      if (to) query = query.lte('created_at', to);
    }
    return query.order('created_at', { ascending: false });
  };

  let { data, error } = await buildQuery(true);
  if (error && (error.code === '42703' || /scheduled_for/.test(error.message || ''))) {
    // scheduled_for column not migrated yet — fall back to created_at-only filtering.
    ({ data, error } = await buildQuery(false));
  }
  if (error) throw createDatabaseError('get shop orders', error, 'getShopOrders');

  const orders = data || [];
  await Promise.all(
    orders.map(async (o) => {
      o.payment_method = derivePaymentMethod(o.stripe_session_id);
      o.screenshot_signed_url = await signScreenshot(o);
    })
  );

  res.status(200).json(createSuccessResponse('Shop orders retrieved', orders));
});

// PUT /api/data/shop-orders/:orderId/status  { status }
export const updateOrderStatus = asyncHandler(async (req, res) => {
  if (!supabase) throw createExternalServiceError('Supabase not configured');
  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;
  const { orderId } = req.params;
  const { status, reason: rawReason } = req.body || {};
  const reason = String(rawReason ?? '').trim();

  if (!ALLOWED_STATUS.includes(status)) {
    throw createValidationError(`status must be one of: ${ALLOWED_STATUS.join(', ')}`);
  }
  // A cancellation must be justified — the reason is kept on the order history.
  if (status === 'cancelled' && !reason) {
    throw createValidationError('A reason is required to cancel an order.');
  }

  const patch = { status, updated_at: new Date().toISOString() };

  // For cancellations, append a reason entry to the audit trail (status_history).
  if (status === 'cancelled') {
    const { data: current } = await supabase
      .from('orders')
      .select('status, status_history')
      .eq('id', orderId)
      .eq('shop_id', shop_id)
      .maybeSingle();
    const history = Array.isArray(current?.status_history) ? current.status_history : [];
    patch.status_history = [
      ...history,
      { kind: 'cancel', from: current?.status ?? null, to: 'cancelled', reason, at: new Date().toISOString() },
    ];
  }

  // Scoped to the merchant's own shop — a non-matching order returns nothing.
  let { data, error } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', orderId)
    .eq('shop_id', shop_id)
    .select('id')
    .maybeSingle();
  if (error && patch.status_history && (error.code === 'PGRST204' || /status_history/.test(error.message || ''))) {
    // status_history column not migrated yet — still perform the status change.
    delete patch.status_history;
    ({ data, error } = await supabase
      .from('orders')
      .update(patch)
      .eq('id', orderId)
      .eq('shop_id', shop_id)
      .select('id')
      .maybeSingle());
  }
  if (error) throw createDatabaseError('update order status', error, 'updateOrderStatus');
  if (!data) throw createNotFoundError('Order');

  await recordActivity(req, {
    action: status === 'cancelled' ? 'order.cancel' : 'order.status',
    entityType: 'order',
    entityId: orderId,
    detail: status === 'cancelled' ? { status, reason } : { status },
  });

  res.status(200).json(createSuccessResponse('Order status updated'));
});

// Where an undo lands, per current status. Linear queue flow runs
// pending/sent → preparing → ready → completed; cancelled returns to the queue.
const UNDO_TARGET = {
  completed: 'ready',
  ready: 'preparing',
  preparing: 'pending',
  cancelled: 'pending',
};

// POST /api/data/shop-orders/:orderId/undo-status  { reason } — revert an
// accidental status change one step back, recording who-knows-why for the audit
// trail (status_history).
export const undoOrderStatus = asyncHandler(async (req, res) => {
  if (!supabase) throw createExternalServiceError('Supabase not configured');
  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;
  const { orderId } = req.params;
  const reason = String(req.body?.reason ?? '').trim();

  if (!reason) throw createValidationError('A reason is required to undo an order status.');

  const { data: order, error: getError } = await supabase
    .from('orders')
    .select('id, status, status_history')
    .eq('id', orderId)
    .eq('shop_id', shop_id)
    .maybeSingle();
  if (getError && getError.code !== '42703') {
    throw createDatabaseError('get order', getError, 'undoOrderStatus');
  }

  // status_history column may not be migrated yet — refetch without it.
  let history = [];
  let currentStatus;
  if (getError) {
    const { data: bare, error: bareError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .eq('shop_id', shop_id)
      .maybeSingle();
    if (bareError) throw createDatabaseError('get order', bareError, 'undoOrderStatus');
    if (!bare) throw createNotFoundError('Order');
    currentStatus = bare.status;
  } else {
    if (!order) throw createNotFoundError('Order');
    currentStatus = order.status;
    history = Array.isArray(order.status_history) ? order.status_history : [];
  }

  const revertTo = UNDO_TARGET[currentStatus];
  if (!revertTo) {
    throw createValidationError(`"${currentStatus}" cannot be undone.`);
  }

  const undoEvent = {
    kind: 'undo',
    from: currentStatus,
    to: revertTo,
    reason,
    at: new Date().toISOString(),
  };

  const patch = {
    status: revertTo,
    updated_at: new Date().toISOString(),
    status_history: [...history, undoEvent],
  };

  let { data, error } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', orderId)
    .eq('shop_id', shop_id)
    .select('id')
    .maybeSingle();
  if (error && (error.code === 'PGRST204' || /status_history/.test(error.message || ''))) {
    // Column not migrated yet — still perform the revert, but the reason can't be stored.
    console.warn('undoOrderStatus: status_history column missing; run scripts/add-order-timing-columns.sql');
    delete patch.status_history;
    ({ data, error } = await supabase
      .from('orders')
      .update(patch)
      .eq('id', orderId)
      .eq('shop_id', shop_id)
      .select('id')
      .maybeSingle());
  }
  if (error) throw createDatabaseError('undo order status', error, 'undoOrderStatus');
  if (!data) throw createNotFoundError('Order');

  await recordActivity(req, {
    action: 'order.undo',
    entityType: 'order',
    entityId: orderId,
    detail: { from: currentStatus, to: revertTo, reason },
  });

  res.status(200).json(createSuccessResponse('Order status reverted', { status: revertTo }));
});

// PUT /api/data/shop-orders/:orderId/estimated-ready  { estimatedReadyAt } — manual
// override of the estimated completion time.
export const setEstimatedReady = asyncHandler(async (req, res) => {
  if (!supabase) throw createExternalServiceError('Supabase not configured');
  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;
  const { orderId } = req.params;
  const { estimatedReadyAt } = req.body || {};

  const ts = new Date(estimatedReadyAt ?? '');
  if (Number.isNaN(ts.getTime())) {
    throw createValidationError('estimatedReadyAt must be a valid date-time.');
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ estimated_ready_at: ts.toISOString(), updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('shop_id', shop_id)
    .select('id')
    .maybeSingle();
  if (error) {
    if (error.code === 'PGRST204' || /estimated_ready_at/.test(error.message || '')) {
      throw createValidationError('Estimated-time columns are missing — run scripts/add-order-timing-columns.sql on the database first.');
    }
    throw createDatabaseError('set estimated ready time', error, 'setEstimatedReady');
  }
  if (!data) throw createNotFoundError('Order');

  res.status(200).json(createSuccessResponse('Estimated time updated', { estimatedReadyAt: ts.toISOString() }));
});

// POST /api/data/shop-orders/delay-all  { minutes, from, to } — shift the estimated
// completion of every ACTIVE order in the range (defaults to today) by ± minutes.
// Orders without an estimate start counting from now.
export const delayAllActive = asyncHandler(async (req, res) => {
  if (!supabase) throw createExternalServiceError('Supabase not configured');
  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;
  const { minutes, from, to } = req.body || {};

  const delta = Number(minutes);
  if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 240) {
    throw createValidationError('minutes must be a non-zero number between -240 and 240.');
  }

  const rangeFrom = from ? new Date(from) : new Date(new Date().setHours(0, 0, 0, 0));
  const rangeTo = to ? new Date(to) : new Date(new Date().setHours(23, 59, 59, 999));
  if (Number.isNaN(rangeFrom.getTime()) || Number.isNaN(rangeTo.getTime())) {
    throw createValidationError('from/to must be valid date-times.');
  }

  const { data: orders, error: listError } = await supabase
    .from('orders')
    .select('id, estimated_ready_at, created_at, status')
    .eq('shop_id', shop_id)
    .gte('created_at', rangeFrom.toISOString())
    .lte('created_at', rangeTo.toISOString())
    .in('status', ['pending', 'sent', 'preparing', 'ready']);
  if (listError) {
    if (listError.code === '42703' || /estimated_ready_at/.test(listError.message || '')) {
      throw createValidationError('Estimated-time columns are missing — run scripts/add-order-timing-columns.sql on the database first.');
    }
    throw createDatabaseError('list active orders', listError, 'delayAllActive');
  }

  const now = Date.now();
  const updates = (orders ?? []).map((o) => {
    const base = o.estimated_ready_at ? new Date(o.estimated_ready_at).getTime() : now;
    return {
      id: o.id,
      estimated_ready_at: new Date(base + delta * 60000).toISOString(),
    };
  });

  for (const u of updates) {
    const { error: updError } = await supabase
      .from('orders')
      .update({ estimated_ready_at: u.estimated_ready_at, updated_at: new Date().toISOString() })
      .eq('id', u.id)
      .eq('shop_id', shop_id);
    if (updError) throw createDatabaseError('delay order', updError, 'delayAllActive');
  }

  res.status(200).json(createSuccessResponse('Active orders shifted', { updated: updates.length, minutes: delta }));
});

// GET /api/data/shop-orders/preorder-counts?from=ISO&to=ISO — scheduled_for stamps
// of ACTIVE pre-orders in the range. Returned raw so the client groups them by its
// own local day (avoids server/client timezone drift).
export const getPreorderSchedule = asyncHandler(async (req, res) => {
  if (!supabase) throw createExternalServiceError('Supabase not configured');
  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;
  const { from, to } = req.query;

  const rangeFrom = new Date(from ?? '');
  const rangeTo = new Date(to ?? '');
  if (Number.isNaN(rangeFrom.getTime()) || Number.isNaN(rangeTo.getTime())) {
    throw createValidationError('from and to must be valid date-times.');
  }

  const { data, error } = await supabase
    .from('orders')
    .select('scheduled_for')
    .eq('shop_id', shop_id)
    .not('scheduled_for', 'is', null)
    .gte('scheduled_for', rangeFrom.toISOString())
    .lte('scheduled_for', rangeTo.toISOString())
    .in('status', ['pending', 'sent', 'preparing', 'ready']);
  if (error) {
    if (error.code === '42703' || /scheduled_for/.test(error.message || '')) {
      // Column not migrated yet — the calendar just shows zero pre-orders.
      return res.status(200).json(createSuccessResponse('Pre-order schedule', { scheduled: [] }));
    }
    throw createDatabaseError('get pre-order schedule', error, 'getPreorderSchedule');
  }

  res.status(200).json(createSuccessResponse('Pre-order schedule', {
    scheduled: (data ?? []).map((r) => r.scheduled_for),
  }));
});

// POST /api/data/shop-orders/:orderId/confirm-payment — verify a manual PayNow
// payment (after reviewing the uploaded screenshot).
export const confirmManualPayment = asyncHandler(async (req, res) => {
  if (!supabase) throw createExternalServiceError('Supabase not configured');
  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;
  const { orderId } = req.params;

  const { data, error } = await supabase
    .from('orders')
    .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('shop_id', shop_id)
    .select('id')
    .maybeSingle();
  if (error) throw createDatabaseError('confirm payment', error, 'confirmManualPayment');
  if (!data) throw createNotFoundError('Order');

  await recordActivity(req, { action: 'order.payment_confirm', entityType: 'order', entityId: orderId });

  res.status(200).json(createSuccessResponse('Payment confirmed'));
});
