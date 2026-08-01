/**
 * HomeFood has exactly two subscription plans:
 *
 *   Free — every merchant is on this by default. No card required.
 *   Pro  — S$39.90/month billed yearly, or S$49.90/month billed monthly.
 *
 * The plans do NOT differ on console features: menu builder, orders,
 * pre-orders, terminal, loyalty, ratings and analytics are all in Free.
 * The differences are in how customers are allowed to pay:
 *
 *   Free — Automatic PayNow (5%) and cards/wallets (8%). No manual PayNow, so
 *          AI PayNow verification is not applicable — there are no screenshots
 *          to verify.
 *   Pro  — Manual PayNow (0%), Automatic PayNow (3%), cards and wallets (6%),
 *          plus AI verification of manual PayNow screenshots.
 *
 * During the early adopter window every merchant is put on Pro at S$0 via a
 * 100%-off forever Stripe coupon, so nobody is restricted to Free yet.
 * See readme_update_stripe.md.
 */

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export const PRO_MONTHLY_PRICE = 49.9;        // billed every month
export const PRO_YEARLY_MONTHLY_PRICE = 39.9; // effective per-month rate when billed yearly
export const PRO_YEARLY_PRICE = Number((PRO_YEARLY_MONTHLY_PRICE * 12).toFixed(2)); // 478.80

/** Saving from paying yearly instead of monthly, over 12 months. */
export const YEARLY_SAVING = Number(((PRO_MONTHLY_PRICE - PRO_YEARLY_MONTHLY_PRICE) * 12).toFixed(2)); // 120.00

// ---------------------------------------------------------------------------
// Payment methods and processing rates
//
// The Pro rates are the rates HomeFood charges today (see the public
// "Payment Types & Fees" page). Free pays more on every method it can use,
// and can't use manual PayNow at all — `null` below means "not available on
// this plan", which is different from a 0% rate.
//
// Keep these in step with the public fee table in
// src/app/(home)/payment-types-and-fees/PaymentTypesAndFees.js.
// ---------------------------------------------------------------------------

const PRO_MANUAL_PAYNOW_RATE = 0;
const PRO_AUTO_PAYNOW_RATE = 3;
const PRO_CARD_RATE = 6;
const FREE_AUTO_PAYNOW_RATE = 5;
const FREE_CARD_RATE = 8;

/** How much cheaper each method is on Pro, in percentage points. */
const AUTO_PAYNOW_SAVING = FREE_AUTO_PAYNOW_RATE - PRO_AUTO_PAYNOW_RATE; // 2
const CARD_SAVING = FREE_CARD_RATE - PRO_CARD_RATE; // 2

export const PLAN_FEES = {
    free: {
        manualPayNow: null, // not available on Free
        autoPayNow: `${FREE_AUTO_PAYNOW_RATE}%`,
        card: `${FREE_CARD_RATE}%`,
    },
    pro: {
        manualPayNow: `${PRO_MANUAL_PAYNOW_RATE}%`,
        autoPayNow: `${PRO_AUTO_PAYNOW_RATE}%`,
        card: `${PRO_CARD_RATE}%`,
    },
};

// ---------------------------------------------------------------------------
// Plans
//
// `lookup_key` must match the Stripe Price lookup key exactly. FREE_LOOKUP_KEY
// is a local sentinel — there is no Stripe price behind it, because being on
// Free means having no active subscription at all.
// ---------------------------------------------------------------------------

export const FREE_LOOKUP_KEY = 'homefood_free';
export const PRO_MONTHLY_LOOKUP_KEY = 'homefood_pro_monthly';
export const PRO_YEARLY_LOOKUP_KEY = 'homefood_pro_yearly';

export const PRO_LOOKUP_KEYS = [PRO_MONTHLY_LOOKUP_KEY, PRO_YEARLY_LOOKUP_KEY];

/** True when the merchant is on a paid plan (i.e. anything that isn't Free). */
export const isProLookupKey = (lookupKey) =>
    !!lookupKey && PRO_LOOKUP_KEYS.includes(String(lookupKey).trim());

// `na: true` marks a line that doesn't apply to the plan at all, as opposed to
// a feature the plan is missing. AI PayNow verification is N/A on Free because
// Free has no manual PayNow, so there is nothing to verify.
const freeFeatures = [
    { name: 'Public shop page & menu builder', included: true },
    { name: 'Orders, pre-orders & terminal', included: true },
    { name: 'Loyalty cards, Scan to Win & analytics', included: true },
    { name: `Automatic PayNow — ${PLAN_FEES.free.autoPayNow} fee`, included: true },
    { name: `Credit cards & wallets — ${PLAN_FEES.free.card} fee`, included: true },
    { name: 'Manual PayNow', included: false },
    { name: 'AI PayNow screenshot verification', included: false, na: true },
];

const proFeatures = [
    { name: 'Everything in Free', included: true },
    { name: `Manual PayNow — ${PLAN_FEES.pro.manualPayNow} fee`, included: true },
    { name: `Automatic PayNow — ${PLAN_FEES.pro.autoPayNow} fee (${AUTO_PAYNOW_SAVING}% lower)`, included: true },
    { name: `Credit cards & wallets — ${PLAN_FEES.pro.card} fee (${CARD_SAVING}% lower)`, included: true },
    { name: 'AI PayNow screenshot verification', included: true },
    { name: 'Priority support', included: true },
];

export const FREE_PLAN = {
    name: 'Free',
    lookup_key: FREE_LOOKUP_KEY,
    price: 0,
    monthlyEquivalent: 0,
    interval: null,
    isFree: true,
    features: freeFeatures,
    description: 'Everything you need to take orders. No monthly fee, no commitment.',
};

export const SUBSCRIPTION_DATA = [
    FREE_PLAN,
    {
        name: 'Pro (Monthly)',
        lookup_key: PRO_MONTHLY_LOOKUP_KEY,
        price: PRO_MONTHLY_PRICE,
        monthlyEquivalent: PRO_MONTHLY_PRICE,
        interval: 'month',
        isFree: false,
        features: proFeatures,
        description: 'All payment methods, lower PayNow fees and AI verification. Billed monthly.',
    },
    {
        name: 'Pro (Yearly)',
        lookup_key: PRO_YEARLY_LOOKUP_KEY,
        price: PRO_YEARLY_PRICE,
        monthlyEquivalent: PRO_YEARLY_MONTHLY_PRICE,
        interval: 'year',
        isFree: false,
        features: proFeatures,
        description: `All payment methods, lower PayNow fees and AI verification. Save S$${YEARLY_SAVING.toFixed(2)} a year.`,
    },
];

/** Look up a plan by its Stripe lookup key. */
export const findPlanByLookupKey = (lookupKey) =>
    SUBSCRIPTION_DATA.find((plan) => plan.lookup_key === lookupKey) || null;

/** The Pro plan for a given billing interval ('month' | 'year'). */
export const getProPlan = (billingInterval) =>
    findPlanByLookupKey(billingInterval === 'year' ? PRO_YEARLY_LOOKUP_KEY : PRO_MONTHLY_LOOKUP_KEY);
