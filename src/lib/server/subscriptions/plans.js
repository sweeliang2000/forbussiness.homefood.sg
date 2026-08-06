import 'server-only';

/**
 * The browser may request only these stable application plan keys. Stripe
 * Price IDs remain server-only configuration and are validated before use.
 */
export const BILLING_PLANS = Object.freeze({
  pro_monthly: Object.freeze({
    key: 'pro_monthly',
    lookupKey: 'homefood_pro_monthly',
    priceEnv: 'STRIPE_PRO_MONTHLY_PRICE_ID',
    interval: 'month',
    expectedUnitAmount: 4788,
  }),
  pro_yearly: Object.freeze({
    key: 'pro_yearly',
    lookupKey: 'homefood_pro_yearly',
    priceEnv: 'STRIPE_PRO_YEARLY_PRICE_ID',
    interval: 'year',
    expectedUnitAmount: 47880,
  }),
});

export const ENTITLED_STRIPE_STATUSES = new Set(['active', 'trialing']);

export function getBillingPlan(planKey) {
  return typeof planKey === 'string' ? BILLING_PLANS[planKey] ?? null : null;
}

export function getConfiguredPriceId(plan) {
  const priceId = process.env[plan.priceEnv];
  if (!priceId) {
    throw new Error(`${plan.priceEnv} is not set`);
  }
  return priceId;
}

export function getConfiguredProductId() {
  const productId = process.env.STRIPE_PRO_PRODUCT_ID;
  if (!productId) throw new Error('STRIPE_PRO_PRODUCT_ID is not set');
  return productId;
}

export function findPlanByPriceId(priceId) {
  if (!priceId) return null;
  return Object.values(BILLING_PLANS).find(
    (plan) => process.env[plan.priceEnv] === priceId
  ) ?? null;
}

export async function resolveAndValidateStripePrice(stripe, plan) {
  const configuredPriceId = getConfiguredPriceId(plan);
  const configuredProductId = getConfiguredProductId();
  const price = await stripe.prices.retrieve(configuredPriceId);

  if (!price.active || price.type !== 'recurring' || !price.recurring) {
    throw new Error(`${plan.priceEnv} must reference an active recurring Price`);
  }
  if (price.currency !== 'sgd') {
    throw new Error(`${plan.priceEnv} must use SGD`);
  }
  if (price.recurring.interval !== plan.interval || price.recurring.interval_count !== 1) {
    throw new Error(`${plan.priceEnv} has the wrong billing interval`);
  }
  if (price.unit_amount !== plan.expectedUnitAmount) {
    throw new Error(
      `${plan.priceEnv} must charge ${plan.expectedUnitAmount} cents, not ${price.unit_amount}`
    );
  }
  const priceProductId = typeof price.product === 'string' ? price.product : price.product?.id;
  if (priceProductId !== configuredProductId) {
    throw new Error(`${plan.priceEnv} does not belong to STRIPE_PRO_PRODUCT_ID`);
  }

  return price;
}
