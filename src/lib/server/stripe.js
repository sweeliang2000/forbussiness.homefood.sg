import 'server-only';

import Stripe from 'stripe';

/**
 * Stripe clients.
 *
 * The old backend did this at module load:
 *
 *     const stripeSecretKey = process.env.STRIPE_SECRET_KEY_LIVE;
 *     if (!stripeSecretKey || !stripe_webhookSecret) throw new Error(...)
 *
 * which is fine for a server that either boots or doesn't, but fatal here: this
 * module is transitively imported by ~90 route files, so webpack evaluates it
 * during `next build`'s module-graph pass. A missing key would fail the build
 * rather than the request. Everything below is therefore lazy.
 *
 * Billing and Connect are separate concerns and deliberately use separate
 * environment variables. This prevents merchant payout configuration from
 * silently selecting the account used for HomeFood platform subscriptions.
 */

const cache = (globalThis.__homefoodStripe ??= {});

/** Platform account: subscriptions, Checkout, Billing Portal and webhooks. */
export function getStripe() {
  if (cache.platform) return cache.platform;

  const key = process.env.STRIPE_BILLING_SECRET_KEY;
  if (!key) throw new Error('STRIPE_BILLING_SECRET_KEY is not set');

  cache.platform = new Stripe(key, {
    apiVersion: '2026-07-29.dahlia',
    maxNetworkRetries: 2,
    timeout: 10_000,
    appInfo: { name: 'HomeFood for Business', version: '1.0.0' },
  });
  return cache.platform;
}

/** Stripe Connect: merchant accounts, account links, product/price sync. */
export function getConnectStripe() {
  if (cache.connect) return cache.connect;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');

  cache.connect = new Stripe(key);
  return cache.connect;
}

/**
 * Webhook signing secret.
 *
 * Not cached: it's a string, and re-reading costs nothing while making it
 * obvious that rotating the secret only needs a redeploy.
 */
export function getWebhookSecret() {
  const secret = process.env.STRIPE_BILLING_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_BILLING_WEBHOOK_SECRET is not set');
  return secret;
}
