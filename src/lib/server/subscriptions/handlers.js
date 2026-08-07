import 'server-only';

import { randomUUID } from 'node:crypto';

import { getAuthoritativeUser } from '../authoritative-user';
import { FRONTEND_BASE_URL } from '../env';
import { getStripe, getWebhookSecret } from '../stripe';
import {
  AppError,
  ERROR_TYPES,
  createAuthorizationError,
  createConflictError,
  createExternalServiceError,
  createNotFoundError,
  createSuccessResponse,
  createValidationError,
} from '../errors';
import {
  ENTITLED_STRIPE_STATUSES,
  findPlanByPriceId,
  getBillingPlan,
  resolveAndValidateStripePrice,
} from './plans';
import {
  acquireCheckoutLock,
  acquireWebhookEvent,
  attachCheckoutSession,
  completeWebhookEvent,
  failWebhookEvent,
  getShop,
  releaseCheckoutLock,
  releaseCheckoutSession,
  saveStripeCustomer,
  saveSubscriptionProjection,
} from './repository';

// Stripe requires expires_at to be at least 30 minutes in the future. The
// extra minute absorbs request latency between computing and submitting it.
const CHECKOUT_LIFETIME_SECONDS = 31 * 60;

function applicationBaseUrl() {
  const url = new URL(FRONTEND_BASE_URL);
  const isLoopback = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !isLoopback) {
    throw new Error('FRONTEND_BASE_URL must use HTTPS outside local development');
  }
  return url.origin;
}

function assertTrustedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) {
    throw createAuthorizationError('A browser Origin header is required');
  }

  const configured = (process.env.APP_ALLOWED_ORIGINS || applicationBaseUrl())
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const normalizedOrigin = new URL(origin).origin;
  const allowedOrigins = configured.map((value) => new URL(value).origin);

  if (!allowedOrigins.includes(normalizedOrigin)) {
    throw createAuthorizationError('Request origin is not allowed');
  }
}

function stripeId(value) {
  return typeof value === 'string' ? value : value?.id || null;
}

function subscriptionIdFromInvoice(invoice) {
  return (
    stripeId(invoice.subscription) ||
    stripeId(invoice.parent?.subscription_details?.subscription) ||
    null
  );
}

async function ensureCustomer(stripe, user, shop) {
  if (shop.StripeCustomerID) return shop.StripeCustomerID;

  const customer = await stripe.customers.create(
    {
      email: user.user_id,
      metadata: { shop_id: user.shop_id },
    },
    { idempotencyKey: `homefood-customer-${user.shop_id}` }
  );
  await saveStripeCustomer(user.shop_id, customer.id);
  return customer.id;
}

async function activeStripeSubscription(stripe, shop) {
  if (!shop.subscription_id) return null;
  try {
    const subscription = await stripe.subscriptions.retrieve(shop.subscription_id);
    return ENTITLED_STRIPE_STATUSES.has(subscription.status) ? subscription : null;
  } catch (error) {
    if (error?.statusCode === 404) return null;
    throw error;
  }
}

/**
 * Marks a failure that will recur identically on every redelivery, so the
 * webhook can stop Stripe retrying for three days over something no retry can
 * fix. Anything not marked is assumed transient and left to retry.
 */
function permanentWebhookError(message) {
  const error = new Error(message);
  error.webhookPermanent = true;
  return error;
}

function isPermanentWebhookError(error) {
  if (error?.webhookPermanent) return true;
  // A Stripe 4xx means the request itself is wrong — except 429, which is the
  // one 4xx that a later attempt can succeed at.
  const status = error?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500 && status !== 429) {
    return true;
  }
  // A malformed DynamoDB request will be just as malformed next time.
  if (error?.name === 'ValidationException') return true;
  return false;
}

/**
 * The stored/incoming pairs behind each write guard, with the stored type
 * included: a legacy row holding a number as a string compares false in
 * DynamoDB while still looking correct in a log line.
 */
function describeGuardInputs(shop, projection) {
  const stored = (value) => ({ value: value ?? null, type: typeof value });
  return {
    shop_id: stored(shop.shop_id),
    StripeCustomerID: { ...stored(shop.StripeCustomerID), incoming: projection.customerId },
    subscription_id: { ...stored(shop.subscription_id), incoming: projection.subscriptionId },
    subscription_created_at: {
      ...stored(shop.subscription_created_at),
      incoming: projection.subscriptionCreatedAt,
    },
    subscription_updated_at: {
      ...stored(shop.subscription_updated_at),
      incoming: projection.updatedAt,
    },
  };
}

/** Re-evaluates each guard in JS so the thrown message names the failing one. */
function summarizeGuardMismatch(shop, projection) {
  const failing = [];

  if (!shop.shop_id) failing.push('shop row has no shop_id');

  if (shop.StripeCustomerID && shop.StripeCustomerID !== projection.customerId) {
    failing.push(
      `StripeCustomerID stored=${shop.StripeCustomerID} incoming=${projection.customerId}`
    );
  }

  const storedCreated = shop.subscription_created_at;
  if (
    storedCreated !== undefined &&
    shop.subscription_id !== projection.subscriptionId &&
    !(Number(storedCreated) <= projection.subscriptionCreatedAt)
  ) {
    failing.push(
      `subscription_created_at stored=${storedCreated} incoming=${projection.subscriptionCreatedAt}`
    );
  }

  const storedUpdated = shop.subscription_updated_at;
  if (storedUpdated !== undefined && !(Number(storedUpdated) <= projection.updatedAt)) {
    failing.push(
      `subscription_updated_at stored=${storedUpdated} incoming=${projection.updatedAt}`
    );
  }

  if (!failing.length) {
    // Every guard passes against the row we just read, so the row must have
    // changed between the failed write and this read.
    return 'no guard fails on re-read; the row changed concurrently';
  }
  return failing.join('; ');
}

async function stripeCustomerIsGone(stripe, customerId) {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return Boolean(customer?.deleted);
  } catch (error) {
    if (error?.statusCode === 404) return true;
    throw error;
  }
}

function subscriptionProjection(subscription) {
  const item = subscription.items?.data?.[0];
  const priceId = stripeId(item?.price);
  const plan = findPlanByPriceId(priceId);
  if (!plan) {
    throw permanentWebhookError(
      `Subscription ${subscription.id} uses an unconfigured Price (${priceId || 'unknown'})`
    );
  }

  const customerId = stripeId(subscription.customer);
  const shopId = subscription.metadata?.shop_id;
  if (!customerId || !shopId) {
    throw permanentWebhookError(
      `Subscription ${subscription.id} is missing HomeFood metadata`
    );
  }

  return {
    shopId,
    customerId,
    subscriptionId: subscription.id,
    subscriptionCreatedAt: subscription.created,
    planKey: plan.key,
    lookupKey: plan.lookupKey,
    status: subscription.status,
    entitled: ENTITLED_STRIPE_STATUSES.has(subscription.status),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    currentPeriodEnd: item?.current_period_end || subscription.current_period_end || null,
    updatedAt: Math.floor(Date.now() / 1000),
  };
}

async function syncSubscription(stripe, subscriptionOrId) {
  const subscription =
    typeof subscriptionOrId === 'string'
      ? await stripe.subscriptions.retrieve(subscriptionOrId, {
          expand: ['items.data.price'],
        })
      : subscriptionOrId;
  const projection = subscriptionProjection(subscription);

  let result = await saveSubscriptionProjection(projection.shopId, projection);
  if (result.written) return projection;

  // The write was refused by its guards. Work out which guard, because most of
  // the reasons are benign and only one of them is a real fault.
  const shop = result.shop;
  if (!shop) {
    throw permanentWebhookError(
      `Subscription ${subscription.id} names shop ${projection.shopId}, which does not exist`
    );
  }

  // A concurrent handler already wrote state it read at least as recently as
  // ours. Ours is redundant, not failed.
  if (Number(shop.subscription_updated_at || 0) >= projection.updatedAt) {
    return projection;
  }

  // The row has moved on to a subscription created after this one; a late
  // event must not resurrect the superseded subscription.
  if (
    shop.subscription_id &&
    shop.subscription_id !== projection.subscriptionId &&
    Number(shop.subscription_created_at || 0) > projection.subscriptionCreatedAt
  ) {
    return projection;
  }

  const storedCustomer = shop.StripeCustomerID;
  if (storedCustomer && storedCustomer !== projection.customerId) {
    // Deleting a customer in the Stripe dashboard strands its id on the shop
    // row, and the customer guard then rejects every subsequent event for that
    // shop — forever, since nothing else clears the field. Adopt the new
    // customer only once the stored one is proven gone; reassigning a live
    // customer is exactly what the guard exists to prevent.
    if (!(await stripeCustomerIsGone(stripe, storedCustomer))) {
      throw permanentWebhookError(
        `Shop ${projection.shopId} is linked to live Stripe customer ${storedCustomer}, but ` +
          `subscription ${subscription.id} belongs to ${projection.customerId}. ` +
          'Refusing to reassign; this needs manual reconciliation.'
      );
    }

    console.warn(
      `[Stripe webhook] Shop ${projection.shopId}: stored customer ${storedCustomer} no longer ` +
        `exists in Stripe; adopting ${projection.customerId} from subscription ${subscription.id}.`
    );
    result = await saveSubscriptionProjection(projection.shopId, projection, {
      adoptCustomer: true,
    });
    if (result.written) return projection;
  }

  // Nothing above explains the rejection. Report the guard inputs rather than
  // just the fact of failure — a bare "refused" leaves no way to tell a lost
  // race from a type mismatch in a legacy row.
  console.error(
    `[Stripe subscription] Projection refused for shop ${projection.shopId}`,
    describeGuardInputs(shop, projection)
  );
  // Left transient: the likeliest cause is the row changing between the write
  // and the re-read, which a retry settles.
  throw new Error(
    `Subscription projection for shop ${projection.shopId} was refused by its write guards ` +
      `(${summarizeGuardMismatch(shop, projection)})`
  );
}

async function recoverExistingCheckout(stripe, user, plan, shop) {
  const lockId = shop?.subscription_checkout_lock;
  const sessionId = shop?.subscription_checkout_session_id;

  if (sessionId) {
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      if (error?.statusCode !== 404) throw error;
      await releaseCheckoutSession(user.shop_id, sessionId);
      return null;
    }

    if (
      session.client_reference_id !== user.shop_id ||
      session.metadata?.shop_id !== user.shop_id
    ) {
      throw new Error('Stored Checkout Session does not belong to this shop');
    }

    if (session.status === 'open') {
      if (session.metadata?.plan_key === plan.key && session.url) {
        return { url: session.url, resumed: true };
      }

      // The merchant changed billing interval. Invalidate the old page before
      // replacing it so that two subscription Checkouts cannot remain usable.
      await stripe.checkout.sessions.expire(session.id);
      await releaseCheckoutSession(user.shop_id, session.id);
      return null;
    }

    if (session.status === 'complete' && session.subscription) {
      await syncSubscription(stripe, session.subscription);
      return {
        url: `${applicationBaseUrl()}/app/subscription/success?session_id=${encodeURIComponent(session.id)}`,
        resumed: true,
      };
    }

    await releaseCheckoutSession(user.shop_id, session.id);
    return null;
  }

  if (lockId) {
    const expiresAt = Number(shop.subscription_checkout_lock_expires_at || 0);
    if (expiresAt >= Math.floor(Date.now() / 1000)) {
      // Session creation is between the atomic lock and Stripe returning its ID.
      return { pending: true };
    }
    await releaseCheckoutLock(user.shop_id, lockId);
  }

  return null;
}

function sendCheckoutRecovery(res, recovery) {
  return res.status(200).json(
    createSuccessResponse(
      recovery.resumed ? 'Existing checkout resumed' : 'Checkout session created',
      { url: recovery.url, resumed: Boolean(recovery.resumed) }
    )
  );
}

export async function createCheckoutSession(req, res) {
  assertTrustedOrigin(req);
  const user = await getAuthoritativeUser(req, { ownerOnly: true });
  const plan = getBillingPlan(req.body?.plan);
  if (!plan) {
    throw createValidationError('plan must be pro_monthly or pro_yearly');
  }

  const stripe = getStripe();
  const shop = await getShop(user.shop_id);
  if (!shop) throw createNotFoundError('Shop');

  try {
    if (await activeStripeSubscription(stripe, shop)) {
      throw createConflictError('This shop already has an active subscription. Use the billing portal to change it.');
    }

    const existingCheckout = await recoverExistingCheckout(stripe, user, plan, shop);
    if (existingCheckout?.url) return sendCheckoutRecovery(res, existingCheckout);
    if (existingCheckout?.pending) {
      throw createConflictError('Checkout is opening. Please try again in a few seconds.');
    }

    const price = await resolveAndValidateStripePrice(stripe, plan);
    const lockId = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + CHECKOUT_LIFETIME_SECONDS;
    let acquired = await acquireCheckoutLock(user.shop_id, lockId, expiresAt);
    if (!acquired) {
      // Another request may have created the session between our first read and
      // lock attempt. Recover it once instead of making the merchant wait.
      const latestShop = await getShop(user.shop_id);
      const concurrentCheckout = await recoverExistingCheckout(stripe, user, plan, latestShop);
      if (concurrentCheckout?.url) return sendCheckoutRecovery(res, concurrentCheckout);
      if (concurrentCheckout?.pending) {
        throw createConflictError('Checkout is opening. Please try again in a few seconds.');
      }

      acquired = await acquireCheckoutLock(user.shop_id, lockId, expiresAt);
      if (!acquired) {
        throw createConflictError('Checkout is opening. Please try again in a few seconds.');
      }
    }

    try {
      const customerId = await ensureCustomer(stripe, user, shop);
      const session = await stripe.checkout.sessions.create(
        {
          mode: 'subscription',
          customer: customerId,
          client_reference_id: user.shop_id,
          line_items: [{ price: price.id, quantity: 1 }],
          allow_promotion_codes: true,
          payment_method_collection: 'if_required',
          billing_address_collection: 'auto',
          success_url: `${applicationBaseUrl()}/app/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${applicationBaseUrl()}/app/subscription?canceled=true`,
          expires_at: expiresAt,
          metadata: {
            shop_id: user.shop_id,
            plan_key: plan.key,
          },
          subscription_data: {
            metadata: {
              shop_id: user.shop_id,
              plan_key: plan.key,
            },
          },
        },
        { idempotencyKey: `homefood-checkout-${user.shop_id}-${lockId}` }
      );

      await attachCheckoutSession(user.shop_id, lockId, session.id);
      return sendCheckoutRecovery(res, { url: session.url, resumed: false });
    } catch (error) {
      await releaseCheckoutLock(user.shop_id, lockId);
      throw error;
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw createExternalServiceError('Stripe', 'create checkout session', error);
  }
}

export async function createPortalSession(req, res) {
  assertTrustedOrigin(req);
  const user = await getAuthoritativeUser(req, { ownerOnly: true });
  const shop = await getShop(user.shop_id);
  if (!shop?.StripeCustomerID) throw createNotFoundError('Stripe customer');

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: shop.StripeCustomerID,
      return_url: `${applicationBaseUrl()}/app/subscription/manage`,
    });
    return res.status(200).json(
      createSuccessResponse('Billing portal session created', { url: session.url })
    );
  } catch (error) {
    throw createExternalServiceError('Stripe', 'create billing portal session', error);
  }
}

export async function getSubscriptionStatus(req, res) {
  const user = await getAuthoritativeUser(req);
  let shop = await getShop(user.shop_id);
  if (!shop) throw createNotFoundError('Shop');

  // One-time migration path for subscriptions written by the retired flow.
  // Stripe, not legacy DynamoDB strings, decides whether access is active.
  if (shop.subscription_id && typeof shop.subscription_entitled !== 'boolean') {
    await syncSubscription(getStripe(), shop.subscription_id);
    shop = await getShop(user.shop_id);
  }

  return res.status(200).json(
    createSuccessResponse('Subscription status retrieved', {
      plan: shop.subscription_plan_key || 'free',
      lookup_key: shop.lookup_key || null,
      status: shop.subscription_status || shop.StripeCustomerSubscriptionStatus || null,
      entitled: Boolean(shop.subscription_entitled),
      cancel_at_period_end: Boolean(shop.subscription_cancel_at_period_end),
      current_period_end: shop.subscription_current_period_end || null,
    })
  );
}

export async function getCheckoutStatus(req, res) {
  const user = await getAuthoritativeUser(req, { ownerOnly: true });
  const sessionId = req.query?.session_id;
  if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId || '')) {
    throw createValidationError('A valid Checkout Session ID is required');
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });
    if (session.client_reference_id !== user.shop_id || session.metadata?.shop_id !== user.shop_id) {
      throw createAuthorizationError('This Checkout Session does not belong to your shop');
    }

    let projection = null;
    if (session.status === 'complete' && session.subscription) {
      projection = await syncSubscription(stripe, session.subscription);
    }

    return res.status(200).json(
      createSuccessResponse('Checkout status retrieved', {
        checkout_status: session.status,
        payment_status: session.payment_status,
        subscription_status: projection?.status || null,
        entitled: projection?.entitled || false,
      })
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw createExternalServiceError('Stripe', 'retrieve checkout session', error);
  }
}

export async function getSubscriptionEndDate(req, res) {
  const user = await getAuthoritativeUser(req);
  const shop = await getShop(user.shop_id);
  if (!shop) throw createNotFoundError('Shop');

  const periodEnd = shop.subscription_current_period_end || null;
  const serviceEndsAt = shop.subscription_cancel_at_period_end ? periodEnd : null;
  return res.status(200).json(
    createSuccessResponse('Subscription end date retrieved', {
      status: shop.subscription_status || null,
      cancel_at_period_end: Boolean(shop.subscription_cancel_at_period_end),
      service_ends_at: serviceEndsAt,
      service_ends_at_formatted: serviceEndsAt
        ? new Date(serviceEndsAt * 1000).toISOString()
        : null,
      scheduled_downgrade_effective_at: null,
      scheduled_downgrade_effective_at_formatted: null,
    })
  );
}

const HANDLED_WEBHOOK_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.expired',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
]);

/** Runs one event and reports the shop it touched, for the ledger. */
async function processWebhookEvent(stripe, event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode === 'subscription' && session.subscription) {
        const projection = await syncSubscription(stripe, stripeId(session.subscription));
        return projection.shopId;
      }
      return session.metadata?.shop_id || null;
    }
    case 'checkout.session.expired': {
      const session = event.data.object;
      const shopId = session.metadata?.shop_id;
      if (session.mode === 'subscription' && shopId) {
        await releaseCheckoutSession(shopId, session.id);
      }
      return shopId || null;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const projection = await syncSubscription(stripe, event.data.object.id);
      return projection.shopId;
    }
    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const subscriptionId = subscriptionIdFromInvoice(event.data.object);
      if (!subscriptionId) return null;
      const projection = await syncSubscription(stripe, subscriptionId);
      return projection.shopId;
    }
    default:
      return null;
  }
}

export async function handleStripeWebhook(req, res) {
  const signature = req.headers['stripe-signature'];
  if (!signature || !Buffer.isBuffer(req.body)) {
    // Previously silent, which made a misrouted or misparsed delivery
    // indistinguishable from no delivery at all.
    console.error(
      '[Stripe webhook] Rejected before verification:',
      !signature ? 'missing stripe-signature header' : 'body was not a raw Buffer'
    );
    return res.sendStatus(400);
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, signature, getWebhookSecret());
  } catch (error) {
    // Nearly always STRIPE_BILLING_WEBHOOK_SECRET not matching the endpoint
    // that sent this event. The message says which; the payload is never
    // logged, since an unverified body is untrusted input.
    console.error('[Stripe webhook] Signature verification failed:', error?.message);
    return res.sendStatus(400);
  }

  // Checked before the ledger: an endpoint subscribed to more types than these
  // would otherwise spend a row, and a 90-day TTL, on every event we ignore.
  if (!HANDLED_WEBHOOK_EVENTS.has(event.type)) {
    return res.status(200).json({ received: true, ignored: true });
  }

  let acquired = false;
  try {
    const lease = await acquireWebhookEvent(event);
    acquired = lease.acquired;
    if (!acquired) {
      return res.status(200).json({ received: true, duplicate: true });
    }
    if (lease.attempts > 1) {
      console.warn(
        `[Stripe webhook] Retrying ${event.type} ${event.id} (attempt ${lease.attempts}).`
      );
    }

    const shopId = await processWebhookEvent(getStripe(), event);
    await completeWebhookEvent(event.id, { shopId });
    return res.status(200).json({ received: true });
  } catch (error) {
    const permanent = isPermanentWebhookError(error);

    if (acquired) {
      // Recording the failure must not mask it. If this write fails the row
      // keeps its lease and expires into a retry, so the event is not lost.
      await failWebhookEvent(event.id, { permanent, message: error?.message }).catch(
        (ledgerError) => {
          console.error(
            `[Stripe webhook] Could not record failure for ${event.id}:`,
            ledgerError?.message
          );
        }
      );
    }

    console.error(
      `[Stripe webhook] ${permanent ? 'Permanent' : 'Transient'} failure on ` +
        `${event.type} ${event.id}:`,
      error
    );

    if (permanent) {
      // Retrying cannot change the outcome, and three days of redeliveries
      // would bury the transient failures that are worth reacting to. Ack it;
      // the ledger row holds the reason under failed_permanent.
      return res.status(200).json({ received: true, failed: true });
    }
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

export async function disabledLegacySubscriptionMutation(_req, _res) {
  throw new AppError(
    'This subscription operation has moved to the secure Stripe Billing Portal.',
    ERROR_TYPES.CONFLICT_ERROR,
    410
  );
}
