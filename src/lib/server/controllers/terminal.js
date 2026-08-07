/**
 * PORTED from the Express backend: controllers/terminal.js
 *
 * Converted CommonJS -> ESM. Handler bodies are otherwise unchanged: they still
 * take (req, res) and still read req.cookies / req.body / req.files, which the
 * express-adapter shim supplies. Do not "modernise" them in place — the value of
 * this file is that it is diffable against the original.
 */

import { GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import crypto from 'node:crypto';

import {
  AppError,
  createSuccessResponse,
  createValidationError,
  createNotFoundError,
  createDatabaseError,
  createExternalServiceError,
  asyncHandler,
} from '../errors';
import { getDynamo } from '../aws';
import { getSupabase } from '../supabase';
import { recordActivity } from './activityLog';
import { isWithinHours, sgtParts, sgtDateStr } from '@/utility/orderingSchedule';

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

const dynamo = { send: (command) => getDynamo().send(command) };

const MENUS_TABLE = 'Menus';
const WALK_IN_PAYMENT_METHODS = ['credit_card', 'paynow', 'cash', 'other'];

function readMenuDraft(item) {
  try {
    return JSON.parse(item.menu.S);
  } catch {
    return null;
  }
}

// POST /api/data/walk-in-order — create an in-store (walk-in) order. Prices are
// recomputed from the shop's own menu (DynamoDB draft); payment is marked paid and
// the counter payment method is encoded in the synthetic walk-in session ID.
export const createWalkInOrder = asyncHandler(async (req, res) => {
  if (!supabase) throw createExternalServiceError('Supabase not configured');
  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;
  const { orderType: rawOrderType, paymentMethod, items, notes, scheduledFor } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    throw createValidationError('items must be a non-empty array');
  }
  if (!WALK_IN_PAYMENT_METHODS.includes(paymentMethod)) {
    throw createValidationError(`paymentMethod must be one of: ${WALK_IN_PAYMENT_METHODS.join(', ')}`);
  }
  const orderType = rawOrderType === 'dine-in' ? 'dine-in' : 'takeaway';

  // Optional pre-order: a future pickup date-time keyed at the counter.
  let scheduledForIso = null;
  if (scheduledFor != null && scheduledFor !== '') {
    const ts = new Date(scheduledFor);
    if (Number.isNaN(ts.getTime())) throw createValidationError('scheduledFor must be a valid date-time.');
    if (ts.getTime() <= Date.now()) throw createValidationError('scheduledFor must be in the future.');
    if (ts.getTime() > Date.now() + 90 * 24 * 60 * 60 * 1000) {
      throw createValidationError('scheduledFor cannot be more than 90 days ahead.');
    }
    scheduledForIso = ts.toISOString();
  }

  let menuItem;
  try {
    const result = await dynamo.send(new GetItemCommand({ TableName: MENUS_TABLE, Key: { shop_id: { S: shop_id } } }));
    menuItem = result.Item;
  } catch (err) {
    throw createDatabaseError('get menu', err, 'createWalkInOrder');
  }
  if (!menuItem) throw createValidationError('No menu found for this shop.');
  const menu = readMenuDraft(menuItem);
  if (!menu) throw createValidationError('Menu data is invalid.');

  const menuItemById = {};
  for (const mi of (Array.isArray(menu.items) ? menu.items : [])) menuItemById[String(mi.id)] = mi;

  // Shop-level reusable option groups (items may reference them by optionGroupIds).
  const libraryGroupById = {};
  for (const g of (Array.isArray(menu.optionGroupsLibrary) ? menu.optionGroupsLibrary : [])) {
    libraryGroupById[String(g.id)] = g;
  }

  const groupsForMenuItem = (mi) => {
    const groups = [...(mi.optionGroups ?? [])];
    for (const gid of (Array.isArray(mi.optionGroupIds) ? mi.optionGroupIds : [])) {
      const g = libraryGroupById[String(gid)];
      if (g && !groups.some((x) => String(x.id) === String(g.id))) groups.push(g);
    }
    return groups;
  };

  // Recompute every amount from the menu — never trust client-sent prices.
  const orderItems = [];
  let subtotalCents = 0;
  for (const cartItem of items) {
    const mi = menuItemById[String(cartItem.itemId)];
    if (!mi) throw createValidationError(`Item not found in menu: ${cartItem.itemId}`);
    if (mi.soldOut) throw createValidationError(`Item is sold out: ${mi.name}`);
    const qty = Math.max(1, parseInt(cartItem.quantity, 10) || 1);
    const baseDollars = orderType === 'dine-in'
      ? (mi.dineInBasePrice ?? mi.dineInPrice ?? 0)
      : (mi.takeawayBasePrice ?? 0);

    const optionById = {};
    for (const g of groupsForMenuItem(mi)) {
      for (const o of (g.options ?? [])) optionById[String(o.id)] = o;
    }
    let optionDeltaDollars = 0;
    const optionNames = [];
    for (const sel of (cartItem.selectedOptions ?? [])) {
      const opt = optionById[String(sel.optionId)];
      if (!opt) throw createValidationError(`Option not found for item ${cartItem.itemId}: ${sel.optionId}`);
      if (opt.soldOut) throw createValidationError(`Option is sold out: ${opt.name}`);
      optionDeltaDollars += Number(opt.additionalPrice) || 0;
      optionNames.push(opt.name);
    }

    const unitCents = Math.round((Number(baseDollars) + optionDeltaDollars) * 100);
    if (!Number.isFinite(unitCents) || unitCents < 0) throw createValidationError(`Invalid price for item ${cartItem.itemId}`);
    subtotalCents += unitCents * qty;
    const itemNotes = String(cartItem.notes ?? '').trim();
    if (itemNotes.length > 500) {
      throw createValidationError(`Notes for ${mi.name} cannot exceed 500 characters.`);
    }
    orderItems.push({
      name: mi.name,
      quantity: qty,
      unitPrice: unitCents / 100,
      options: optionNames,
      notes: itemNotes || null,
    });
  }

  const totalCents = subtotalCents;
  if (totalCents <= 0) throw createValidationError('Order total must be greater than zero');

  // Walk-in customers are at the counter, so no estimated time is stamped at keying —
  // the merchant can set one later from the order card if needed. Pre-orders start as
  // 'pending' (New) so the kitchen picks them up on the scheduled day.
  const orderRow = {
    shop_id,
    user_uid: 'WALK_IN',
    order_type: orderType,
    items: orderItems,
    notes: notes || null,
    subtotal: subtotalCents / 100,
    total: totalCents / 100,
    application_fee: 0,
    currency: 'sgd',
    // Synthetic ID keeps the method queryable without requiring another orders-table
    // migration. Older `walkin_<uuid>` rows remain supported by shopOrders.js.
    stripe_session_id: `walkin_${paymentMethod}_${crypto.randomUUID()}`,
    status: scheduledForIso ? 'pending' : 'preparing',
    payment_status: 'paid',
  };
  if (scheduledForIso) orderRow.scheduled_for = scheduledForIso;

  const { data: inserted, error } = await supabase.from('orders').insert(orderRow).select('id, created_at').single();
  if (error) {
    if (scheduledForIso && (error.code === 'PGRST204' || /scheduled_for/.test(error.message || ''))) {
      throw createValidationError('Pre-order columns are missing — run scripts/add-preorder-and-slug-columns.sql on the database first.');
    }
    throw createDatabaseError('create walk-in order', error, 'createWalkInOrder');
  }

  // Daily queue number = keying position within the order's relevant day (the
  // scheduled day for pre-orders, today otherwise). Derived, not stored — the order
  // list computes the same number by sorting the day's orders by created_at.
  let queueNumber = null;
  try {
    const base = scheduledForIso ? new Date(scheduledForIso) : new Date();
    const dayStart = new Date(base);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(base);
    dayEnd.setHours(23, 59, 59, 999);

    let { count, error: countError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shop_id)
      .lte('created_at', inserted.created_at)
      .or(
        `and(scheduled_for.gte.${dayStart.toISOString()},scheduled_for.lte.${dayEnd.toISOString()}),` +
        `and(scheduled_for.is.null,created_at.gte.${dayStart.toISOString()},created_at.lte.${dayEnd.toISOString()})`
      );
    if (countError && (countError.code === '42703' || /scheduled_for/.test(countError.message || ''))) {
      // scheduled_for column not migrated yet — count today's orders by created_at only.
      ({ count, error: countError } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('shop_id', shop_id)
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', inserted.created_at));
    }
    if (!countError && Number.isFinite(count)) queueNumber = count;
  } catch (e) {
    console.error('createWalkInOrder: queue number lookup failed:', e.message);
  }

  await recordActivity(req, {
    action: scheduledForIso ? 'order.preorder_create' : 'order.walkin_create',
    entityType: 'order',
    entityId: inserted.id,
    detail: { total: totalCents / 100, orderType, paymentMethod, queueNumber, scheduledFor: scheduledForIso },
  });

  res.status(200).json(createSuccessResponse('Walk-in order created', {
    orderId: inserted.id,
    total: totalCents / 100,
    paymentMethod,
    queueNumber,
    scheduledFor: scheduledForIso,
  }));
});

// PUT /api/data/menu/sold-out — operational toggle. Patches the DynamoDB draft AND
// the live Supabase menu (best-effort) immediately.
//   { itemId, soldOut, scope }     → toggles a whole item. scope 'immediate' (default)
//     patches soldOut (sold out for today); scope 'preorder' patches soldOutPreorder.
//   { groupId, optionId, soldOut } → toggles one option of a reusable group. Because
//     groups are shared, the option is patched in the shop-level library and in every
//     item's embedded copy of that group. (Options are not fulfillment-scoped.)
export const toggleMenuSoldOut = asyncHandler(async (req, res) => {
  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;
  const { itemId, soldOut, groupId, optionId, scope } = req.body || {};
  const isOptionToggle = optionId != null;
  if (!isOptionToggle && itemId == null) throw createValidationError('itemId or optionId is required');
  const sold = !!soldOut;
  // Which item field this toggle targets: pre-order availability vs today's.
  const itemField = scope === 'preorder' ? 'soldOutPreorder' : 'soldOut';

  // Patch one option across a list of groups; returns true if anything matched.
  const patchOptionInGroups = (groups) => {
    let patched = false;
    for (const g of (Array.isArray(groups) ? groups : [])) {
      if (groupId != null && String(g.id) !== String(groupId)) continue;
      for (const o of (Array.isArray(g.options) ? g.options : [])) {
        if (String(o.id) === String(optionId)) { o.soldOut = sold; patched = true; }
      }
    }
    return patched;
  };

  const patchMenu = (menu) => {
    let patched = false;
    if (isOptionToggle) {
      patched = patchOptionInGroups(menu.optionGroupsLibrary) || patched;
      for (const it of (Array.isArray(menu.items) ? menu.items : [])) {
        patched = patchOptionInGroups(it.optionGroups) || patched;
      }
    } else {
      for (const it of (Array.isArray(menu.items) ? menu.items : [])) {
        if (String(it.id) === String(itemId)) { it[itemField] = sold; patched = true; break; }
      }
    }
    return patched;
  };

  let menuItem;
  try {
    const result = await dynamo.send(new GetItemCommand({ TableName: MENUS_TABLE, Key: { shop_id: { S: shop_id } } }));
    menuItem = result.Item;
  } catch (err) {
    throw createDatabaseError('get menu', err, 'toggleMenuSoldOut');
  }
  if (!menuItem) throw createNotFoundError('Menu');
  const menu = readMenuDraft(menuItem);
  if (!menu) throw createValidationError('Menu data is invalid.');

  const found = patchMenu(menu);
  if (!found) throw createNotFoundError(isOptionToggle ? 'Menu option' : 'Menu item');

  try {
    await dynamo.send(new PutItemCommand({
      TableName: MENUS_TABLE,
      Item: {
        shop_id: { S: shop_id },
        menu: { S: JSON.stringify(menu) },
        updatedAt: { S: new Date().toISOString() },
        isChanges: menuItem.isChanges ?? { BOOL: false },
      },
    }));
  } catch (err) {
    throw createDatabaseError('save menu', err, 'toggleMenuSoldOut');
  }

  // Reflect to customers immediately (the consumer reads Supabase shops.menu).
  if (supabase) {
    try {
      const { data: shop } = await supabase.from('shops').select('menu').eq('shop_id', shop_id).maybeSingle();
      const liveMenu = shop?.menu;
      if (liveMenu) {
        const patched = patchMenu(liveMenu);
        if (patched) await supabase.from('shops').update({ menu: liveMenu }).eq('shop_id', shop_id);
      }
    } catch (e) {
      console.error('toggleMenuSoldOut: live menu sync failed:', e.message);
    }
  }

  await recordActivity(req, {
    action: 'menu.sold_out',
    entityType: isOptionToggle ? 'option' : 'item',
    entityId: isOptionToggle ? optionId : itemId,
    detail: isOptionToggle
      ? { groupId: groupId ?? null, optionId, soldOut: sold }
      : { itemId, soldOut: sold, scope: itemField === 'soldOutPreorder' ? 'preorder' : 'immediate' },
  });

  res.status(200).json(createSuccessResponse(
    isOptionToggle ? 'Menu option updated' : 'Menu item updated',
    isOptionToggle
      ? { groupId: groupId ?? null, optionId, soldOut: sold }
      : { itemId, soldOut: sold, scope: itemField === 'soldOutPreorder' ? 'preorder' : 'immediate' }
  ));
});

// Effective shop status.
//
// The merchant's switch is the whole answer: a shop is taking orders right now
// if, and only if, someone opened it. Ordering hours do not open a shop and do
// not close one — a shop sitting inside its hours that nobody opened is not
// staffed, and customers get the pre-order path instead of a walk-in order that
// no one is there to cook.
//
// Hours and the calendar are still computed and returned, because the POS uses
// them to know when to prompt the merchant, and to explain the current state
// back to them. They are context, not authority.
async function computeEffectiveShopStatus(shop_id) {
  let isOpen = false;
  let hours = null;

  if (supabase) {
    const { data } = await supabase
      .from('shops')
      .select('is_open, order_hours')
      .eq('shop_id', shop_id)
      .maybeSingle();
    if (data) {
      // Strict `=== true`: a null is_open means the switch was never touched,
      // which is not the same as someone opening the shop.
      isOpen = data.is_open === true;
      if (Array.isArray(data.order_hours) && data.order_hours.length === 7) hours = data.order_hours;
    }
  }

  // Ordering hours not published yet — fall back to the draft ordering settings.
  if (!hours) {
    try {
      const result = await dynamo.send(new GetItemCommand({
        TableName: 'Order_Settings',
        Key: { shopId: { S: shop_id } },
      }));
      if (result.Item) {
        const settings = unmarshall(result.Item);
        if (Array.isArray(settings.hours) && settings.hours.length === 7) hours = settings.hours;
      }
    } catch (e) {
      console.error('computeEffectiveShopStatus: order settings lookup failed:', e.message);
    }
  }

  // Hours are merchant wall-clock times in Singapore, so they have to be read
  // in SGT — this used to use the server's local clock, which is UTC in
  // production and put every window 8 hours out.
  const withinHours = isWithinHours(hours, Date.now());
  const hoursToday = hours ? hours[sgtParts().weekday] ?? null : null;

  let calendarClosed = false;
  let calendarReason = '';
  try {
    const todayKey = sgtDateStr();
    const result = await dynamo.send(new GetItemCommand({
      TableName: 'Order_Calendar_Override',
      Key: { shopId: { S: shop_id }, date: { S: todayKey } },
    }));
    if (result.Item) {
      const override = unmarshall(result.Item);
      if (override.status === 'closed') {
        calendarClosed = true;
        calendarReason = override.reason ?? '';
      }
    }
  } catch (e) {
    console.error('computeEffectiveShopStatus: calendar override lookup failed:', e.message);
  }

  return {
    isOpen,
    withinHours,
    hoursToday,
    // The full week, so the POS can work out when the next window starts or
    // ends without a second round trip.
    hours,
    calendarClosed,
    calendarReason,
    // Deliberately just the switch. Kept as a separate field so callers keep
    // reading one obvious "can they order right now" answer.
    effectiveOpen: isOpen,
  };
}
export { computeEffectiveShopStatus };

// GET /api/data/shop-open — manual flag plus the composed effective status.
export const getShopOpen = asyncHandler(async (req, res) => {
  if (!supabase) throw createExternalServiceError('Supabase not configured');
  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;
  const status = await computeEffectiveShopStatus(shop_id);
  res.status(200).json(createSuccessResponse('Shop open status', status));
});

// PUT /api/data/shop-open  { isOpen } — merchant-controlled open/close.
export const setShopOpen = asyncHandler(async (req, res) => {
  if (!supabase) throw createExternalServiceError('Supabase not configured');
  const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;
  const { isOpen } = req.body || {};
  if (typeof isOpen !== 'boolean') throw createValidationError('isOpen must be a boolean');
  const { error } = await supabase.from('shops').update({ is_open: isOpen }).eq('shop_id', shop_id);
  if (error) throw createDatabaseError('set shop open', error, 'setShopOpen');

  await recordActivity(req, { action: isOpen ? 'shop.open' : 'shop.close', entityType: 'shop', detail: { isOpen } });

  res.status(200).json(createSuccessResponse('Shop status updated', { isOpen }));
});
