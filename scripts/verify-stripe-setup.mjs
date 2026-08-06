#!/usr/bin/env node

import Stripe from 'stripe';

const required = [
  'STRIPE_BILLING_SECRET_KEY',
  'STRIPE_BILLING_WEBHOOK_SECRET',
  'STRIPE_PRO_PRODUCT_ID',
  'STRIPE_PRO_MONTHLY_PRICE_ID',
  'STRIPE_PRO_YEARLY_PRICE_ID',
];

const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

if (!process.env.STRIPE_BILLING_WEBHOOK_SECRET.startsWith('whsec_')) {
  console.error('STRIPE_BILLING_WEBHOOK_SECRET must start with whsec_');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_BILLING_SECRET_KEY);
const expected = [
  {
    env: 'STRIPE_PRO_MONTHLY_PRICE_ID',
    interval: 'month',
    amount: 4788,
  },
  {
    env: 'STRIPE_PRO_YEARLY_PRICE_ID',
    interval: 'year',
    amount: 47880,
  },
];

try {
  const account = await stripe.accounts.retrieve();
  const prices = [];

  for (const config of expected) {
    const price = await stripe.prices.retrieve(process.env[config.env]);
    prices.push(price);

    const problems = [];
    if (!price.active) problems.push('inactive');
    if (price.type !== 'recurring') problems.push('not recurring');
    if (price.currency !== 'sgd') problems.push(`currency is ${price.currency}`);
    if (price.unit_amount !== config.amount) problems.push(`amount is ${price.unit_amount}`);
    if (price.recurring?.interval !== config.interval || price.recurring?.interval_count !== 1) {
      problems.push('wrong interval');
    }
    if (problems.length) {
      throw new Error(`${config.env} (${price.id}): ${problems.join(', ')}`);
    }
  }

  const productIds = new Set(prices.map((price) => String(price.product)));
  if (productIds.size !== 1) {
    throw new Error('Monthly and yearly Prices must belong to the same Stripe Product');
  }
  if (!productIds.has(process.env.STRIPE_PRO_PRODUCT_ID)) {
    throw new Error('The Prices do not belong to STRIPE_PRO_PRODUCT_ID');
  }

  console.log(`Stripe account: ${account.id}`);
  console.log(`Mode: ${process.env.STRIPE_BILLING_SECRET_KEY.startsWith('sk_live_') ? 'live' : 'test'}`);
  console.log(`Product: ${process.env.STRIPE_PRO_PRODUCT_ID}`);
  console.log(`Monthly Price: ${prices[0].id} — SGD 47.88/month`);
  console.log(`Yearly Price: ${prices[1].id} — SGD 478.80/year`);
  console.log('Stripe billing configuration is valid.');
} catch (error) {
  console.error(`Stripe setup check failed: ${error.message}`);
  process.exit(1);
}
