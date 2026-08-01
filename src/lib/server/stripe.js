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
 * On the two keys: the platform key (subscriptions, webhook) and the Connect key
 * (merchant onboarding and payouts) are separate variables in the existing
 * deployment and may or may not be the same Stripe account. Do not collapse them
 * without checking — /api/_selftest reports both key prefixes and account IDs.
 * If STRIPE_SECRET_KEY turns out to be a test key, Connect onboarding has been
 * running in test mode and merging would change live behaviour.
 */

const cache = (globalThis.__homefoodStripe ??= {});

/** Platform account: subscriptions, checkout, billing portal, webhook. */
export function getStripe() {
  if (cache.platform) return cache.platform;

  const key = process.env.STRIPE_SECRET_KEY_LIVE;
  if (!key) throw new Error('STRIPE_SECRET_KEY_LIVE is not set');

  cache.platform = new Stripe(key);
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
  const secret = process.env.STRIPE_WEBHOOK_SECRET_KEY_LIVE;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET_KEY_LIVE is not set');
  return secret;
}
