/**
 * PORTED from the Express backend: controllers/stripeConnect.js
 *
 * Converted CommonJS -> ESM. Handler bodies are otherwise unchanged: they still
 * take (req, res) and still read req.cookies / req.body / req.files, which the
 * express-adapter shim supplies. Do not "modernise" them in place — the value of
 * this file is that it is diffable against the original.
 */

import { UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';

import { getDynamo } from '../aws';
import { getConnectStripe } from '../stripe';
import { FRONTEND_BASE_URL } from '../env';

const stripe = new Proxy(
  {},
  {
    get(_target, prop) {
      return getConnectStripe()[prop];
    },
  }
);

const client = { send: (command) => getDynamo().send(command) };

const getConnectedAccountId = async (shop_id) => {
  const { Item } = await client.send(new GetItemCommand({
    TableName: "Shops",
    Key: { shop_id: { S: shop_id } },
  }));
  return Item?.StripeConnectAccountId?.S || null;
};

const createConnectAccount = async (req, res) => {
  try {
    const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;

    const account = await stripe.accounts.create({
      type: "express",
      country: "SG",
      email: req.user.email,
    });

    await client.send(new UpdateItemCommand({
      TableName: "Shops",
      Key: { shop_id: { S: shop_id } },
      UpdateExpression: "SET StripeConnectAccountId = :accountId",
      ExpressionAttributeValues: {
        ":accountId": { S: account.id },
      },
    }));

    res.json({ accountId: account.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createAccountLink = async (req, res) => {
  try {
    const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;

    const { Item } = await client.send(new GetItemCommand({
      TableName: "Shops",
      Key: { shop_id: { S: shop_id } },
    }));

    const accountId = Item?.StripeConnectAccountId?.S;
    if (!accountId) {
      return res.status(404).json({ error: "No Stripe Connect account found for this shop." });
    }

    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'https://business.homefood.sg';
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      // Stripe sends the merchant back here if the link expires before they finish…
      refresh_url: `${frontendBaseUrl}/app/payments-setup`,
      // …or here once onboarding completes.
      return_url: `${frontendBaseUrl}/app/payments-setup?stripeOnboarding=success`,
    });

    res.json({ url: accountLink.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAccountStatus = async (req, res) => {
  try {
    const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;

    const { Item } = await client.send(new GetItemCommand({
      TableName: "Shops",
      Key: { shop_id: { S: shop_id } },
    }));

    const isEdit = !["pending", "scheduled_released_cancelled"].includes(req.releaseStatus);
    const releaseStatus = req.releaseStatus || null;

    const accountId = Item?.StripeConnectAccountId?.S;
    if (!accountId) {
      return res.json({ connected: false, isEdit, releaseStatus });
    }

    const account = await stripe.accounts.retrieve(accountId);

    res.json({
      connected: true,
      accountId,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      isEdit,
      releaseStatus,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createDashboardLink = async (req, res) => {
  try {
    const shop_id = JSON.parse(req.cookies.userDataHTTP).shop_id;

    const { Item } = await client.send(new GetItemCommand({
      TableName: "Shops",
      Key: { shop_id: { S: shop_id } },
    }));

    const accountId = Item?.StripeConnectAccountId?.S;
    if (!accountId) {
      return res.status(404).json({ error: "No Stripe Connect account found for this shop." });
    }

    const loginLink = await stripe.accounts.createLoginLink(accountId);

    res.json({ url: loginLink.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------- Menu → Stripe product sync ----------
// Menu items ARE the products: on every menu publish the published items are
// reconciled against the products on the shop's connected account (matched by
// metadata.itemId) — new items are created, changed items updated, removed
// items archived. Stripe metadata limits: 50 keys, 500 chars per value; option
// groups are chunked across optionGroups_N keys.
const METADATA_CHUNK_SIZE = 500;
const OPTION_GROUPS_MAX_CHUNKS = 36;

const serializeItemToMetadata = (item, { itemId, photoS3Key, photoName } = {}) => {
  const metadata = {
    itemId,
    categories: JSON.stringify(item.categories ?? []),
    soldOut: String(!!item.soldOut),
    featured: String(!!item.featured),
    availableTakeaway: String(item.availableTakeaway !== false),
    availableDineIn: String(item.availableDineIn !== false),
    pricingOverrideType: item.pricingOverrideType || 'global',
    pricingOverrideCustomPercent: String(Number(item.pricingOverrideCustomPercent) || 0),
    pricingOverrideFixedPrice: String(Number(item.pricingOverrideFixedPrice) || 0),
  };

  if (metadata.categories.length > METADATA_CHUNK_SIZE) {
    const err = new Error("Categories are too long to save.");
    err.statusCode = 400;
    throw err;
  }

  if (photoS3Key) {
    metadata.photoS3Key = photoS3Key;
    metadata.photoName = photoName || '';
  }

  const optionGroupsJson = JSON.stringify(item.optionGroups ?? []);
  if (optionGroupsJson.length > METADATA_CHUNK_SIZE * OPTION_GROUPS_MAX_CHUNKS) {
    const err = new Error("Option groups are too large to save. Please reduce the number of option groups or options.");
    err.statusCode = 400;
    throw err;
  }
  const chunkCount = Math.ceil(optionGroupsJson.length / METADATA_CHUNK_SIZE) || 1;
  metadata.optionGroupsCount = String(chunkCount);
  for (let i = 0; i < chunkCount; i += 1) {
    metadata[`optionGroups_${i}`] = optionGroupsJson.slice(i * METADATA_CHUNK_SIZE, (i + 1) * METADATA_CHUNK_SIZE);
  }

  return metadata;
};

const parseMetadataToItem = (metadata = {}) => {
  let categories = [];
  try {
    categories = JSON.parse(metadata.categories || '[]');
  } catch { categories = []; }

  let optionGroups = [];
  try {
    const chunkCount = Number(metadata.optionGroupsCount) || 0;
    let json = '';
    for (let i = 0; i < chunkCount; i += 1) {
      json += metadata[`optionGroups_${i}`] ?? '';
    }
    optionGroups = json ? JSON.parse(json) : [];
  } catch { optionGroups = []; }

  return {
    id: metadata.itemId || null,
    categories,
    soldOut: metadata.soldOut === 'true',
    featured: metadata.featured === 'true',
    availableTakeaway: metadata.availableTakeaway !== 'false',
    availableDineIn: metadata.availableDineIn !== 'false',
    pricingOverrideType: metadata.pricingOverrideType || 'global',
    pricingOverrideCustomPercent: Number(metadata.pricingOverrideCustomPercent) || 0,
    pricingOverrideFixedPrice: Number(metadata.pricingOverrideFixedPrice) || 0,
    optionGroups,
  };
};

const toUnitAmount = (value) => Math.round((Number(value) || 0) * 100);

// Stored menu items (Menus table / published JSON) nest availability and
// pricingOverride — flatten to the shape serializeItemToMetadata expects.
const mapStoredMenuItem = (item, categoryNamesById = {}) => ({
  categories: (item.categoryIds ?? []).map((id) => categoryNamesById[id]).filter(Boolean),
  soldOut: !!item.soldOut,
  featured: !!item.featured,
  availableTakeaway: item.availability?.takeaway !== false,
  availableDineIn: item.availability?.dineIn !== false,
  pricingOverrideType: item.pricingOverrideType || 'global',
  pricingOverrideCustomPercent: item.pricingOverride?.customPercent ?? 0,
  pricingOverrideFixedPrice: item.pricingOverride?.fixedPrice ?? 0,
  optionGroups: item.optionGroups ?? [],
});

// Replaces a product's takeaway/dine-in price when the amount changed:
// creates the new price, repoints default_price (takeaway only) and the
// metadata price id, then deactivates the old price.
const replaceItemPrice = async (accountId, productId, mode, unitAmount, oldPrice) => {
  const newPrice = await stripe.prices.create({
    product: productId,
    currency: 'sgd',
    unit_amount: unitAmount,
    metadata: { mode },
  }, { stripeAccount: accountId });

  const update = mode === 'takeaway'
    ? { default_price: newPrice.id, metadata: { takeawayPriceId: newPrice.id } }
    : { metadata: { dineInPriceId: newPrice.id } };
  await stripe.products.update(productId, update, { stripeAccount: accountId });

  if (oldPrice) {
    await stripe.prices.update(oldPrice.id, { active: false }, { stripeAccount: accountId });
  }
  return newPrice;
};

const syncMenuToStripeProducts = async (shop_id, menu) => {
  const accountId = await getConnectedAccountId(shop_id);
  if (!accountId) {
    return { status: 'skipped', reason: 'No Stripe Connect account for this shop.' };
  }

  const items = Array.isArray(menu?.items) ? menu.items : [];
  const categoryNamesById = {};
  for (const c of (menu?.categories ?? [])) {
    if (c?.id) categoryNamesById[c.id] = c.name;
  }

  const existingByItemId = {};
  for await (const product of stripe.products.list({ active: true, limit: 100 }, { stripeAccount: accountId })) {
    const itemId = product.metadata?.itemId;
    if (itemId) existingByItemId[itemId] = product;
  }

  // Single pass over active prices to avoid one prices.list call per product.
  const pricesByProduct = {};
  for await (const price of stripe.prices.list({ active: true, limit: 100 }, { stripeAccount: accountId })) {
    const productId = typeof price.product === 'string' ? price.product : price.product?.id;
    if (!productId) continue;
    if (!pricesByProduct[productId]) pricesByProduct[productId] = {};
    if (price.metadata?.mode === 'dine_in') {
      pricesByProduct[productId].dineIn = price;
    } else if (price.metadata?.mode === 'takeaway') {
      pricesByProduct[productId].takeaway = price;
    }
  }

  const summary = { created: 0, updated: 0, archived: 0 };

  for (const item of items) {
    if (!item?.id || !item?.name?.trim()) continue;

    const metadata = serializeItemToMetadata(mapStoredMenuItem(item, categoryNamesById), { itemId: item.id });
    const name = item.name.trim();
    const description = (item.description ?? '').trim();
    // publishMenuUpdate rewrites photo.url to the public CloudFront URL before syncing.
    const photoUrl = item.photo?.url || null;
    const takeawayAmount = toUnitAmount(item.takeawayBasePrice);
    const dineInAmount = toUnitAmount(item.dineInPrice);

    const existing = existingByItemId[item.id];
    if (!existing) {
      const product = await stripe.products.create({
        name,
        ...(description ? { description } : {}),
        ...(photoUrl ? { images: [photoUrl] } : {}),
        metadata,
      }, { stripeAccount: accountId });

      await replaceItemPrice(accountId, product.id, 'takeaway', takeawayAmount, null);
      await replaceItemPrice(accountId, product.id, 'dine_in', dineInAmount, null);
      summary.created += 1;
    } else {
      // Blank out keys no longer produced (e.g. shrunk option-group chunks) so
      // stale chunks never accumulate against the 50-key metadata limit.
      const metadataUpdate = { ...metadata };
      for (const key of Object.keys(existing.metadata ?? {})) {
        if (!(key in metadataUpdate) && key !== 'takeawayPriceId' && key !== 'dineInPriceId') {
          metadataUpdate[key] = '';
        }
      }

      await stripe.products.update(existing.id, {
        name,
        description: description || '',
        images: photoUrl ? [photoUrl] : [],
        metadata: metadataUpdate,
      }, { stripeAccount: accountId });

      const prices = pricesByProduct[existing.id] || {};
      if (!prices.takeaway || prices.takeaway.unit_amount !== takeawayAmount) {
        await replaceItemPrice(accountId, existing.id, 'takeaway', takeawayAmount, prices.takeaway ?? null);
      }
      if (!prices.dineIn || prices.dineIn.unit_amount !== dineInAmount) {
        await replaceItemPrice(accountId, existing.id, 'dine_in', dineInAmount, prices.dineIn ?? null);
      }
      summary.updated += 1;
    }
  }

  // Archive products whose menu item no longer exists. Stripe does not allow
  // hard-deleting a product that has prices, and prices can only be
  // deactivated — archive the product first, then deactivate its prices.
  const liveItemIds = new Set(items.map((i) => i?.id).filter(Boolean));
  for (const [itemId, product] of Object.entries(existingByItemId)) {
    if (liveItemIds.has(itemId)) continue;

    await stripe.products.update(product.id, { active: false }, { stripeAccount: accountId });
    const prices = pricesByProduct[product.id] || {};
    for (const price of [prices.takeaway, prices.dineIn]) {
      if (price) {
        await stripe.prices.update(price.id, { active: false }, { stripeAccount: accountId });
      }
    }
    summary.archived += 1;
  }

  return { status: 'synced', ...summary };
};

export {
  createConnectAccount,
  createAccountLink,
  getAccountStatus,
  createDashboardLink,
  syncMenuToStripeProducts,
  serializeItemToMetadata,
  parseMetadataToItem,
  mapStoredMenuItem,
};
