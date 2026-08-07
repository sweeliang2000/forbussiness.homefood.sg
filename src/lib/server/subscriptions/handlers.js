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
  getShop,
  releaseCheckoutLock,
  releaseCheckoutSession,
  releaseWebhookEvent,
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

function subscriptionProjection(subscription) {
  const item = subscription.items?.data?.[0];
  const priceId = stripeId(item?.price);
  const plan = findPlanByPriceId(priceId);
  if (!plan) {
    throw new Error(`Subscription ${subscription.id} uses an unconfigured Price`);
  }

  const customerId = stripeId(subscription.customer);
  const shopId = subscription.metadata?.shop_id;
  if (!customerId || !shopId) {
    throw new Error(`Subscription ${subscription.id} is missing HomeFood metadata`);
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
  await saveSubscriptionProjection(projection.shopId, projection);
  return projection;
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

export async function handleStripeWebhook(req, res) {
  const signature = req.headers['stripe-signature'];
  if (!signature || !Buffer.isBuffer(req.body)) return res.sendStatus(400);

  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, signature, getWebhookSecret());
  } catch {
    return res.sendStatus(400);
  }

  let acquired = false;
  try {
    acquired = await acquireWebhookEvent(event);
    if (!acquired) return res.status(200).json({ received: true, duplicate: true });

    const stripe = getStripe();
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription) {
          await syncSubscription(stripe, stripeId(session.subscription));
        }
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object;
        const shopId = session.metadata?.shop_id;
        if (session.mode === 'subscription' && shopId) {
          await releaseCheckoutSession(shopId, session.id);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(stripe, event.data.object.id);
        break;
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const subscriptionId = subscriptionIdFromInvoice(event.data.object);
        if (subscriptionId) await syncSubscription(stripe, subscriptionId);
        break;
      }
      default:
        break;
    }

    await completeWebhookEvent(event.id);
    return res.status(200).json({ received: true });
  } catch (error) {
    if (acquired) await releaseWebhookEvent(event.id).catch(() => {});
    console.error('[Stripe webhook] Processing failed:', event.id, event.type, error?.message);
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
