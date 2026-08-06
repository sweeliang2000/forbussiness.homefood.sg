# HomeFood Stripe Subscription Setup Guide

This implementation uses Stripe Checkout for starting a subscription, Stripe Billing Portal for every later billing change, signed webhooks for provisioning, and DynamoDB for a local subscription projection. HomeFood never receives or stores card details.

The browser can request only `pro_monthly` or `pro_yearly`. It cannot send a Price ID, lookup key, amount, coupon, trial duration, customer ID or shop ID. The authenticated Cognito identity is resolved against the `Users` table before any billing action.

## 1. Create the Stripe product and prices

Do all local testing in a Stripe **Sandbox/Test mode** first.

1. Stripe Dashboard → Product catalogue → Add product.
2. Name it `HomeFood Pro`.
3. Add a recurring monthly Price:
   - Currency: SGD
   - Amount: **S$47.88**
   - Billing period: Monthly
   - Copy its `price_...` ID.
4. Add a second recurring Price to the **same Product**:
   - Currency: SGD
   - Amount: **S$478.80**
   - Billing period: Yearly
   - Copy its `price_...` ID.

Both Prices must be on the same Product so the Billing Portal can switch between them.

The products and Prices already created are:

| Environment | Product | Monthly — S$47.88 | Yearly — S$478.80 |
| --- | --- | --- | --- |
| Sandbox | `prod_V1XP3ZyJ3SKA7J` | `price_1U1ULJEF4MjhobEmKxBEoSvR` | `price_1U1UKsEF4MjhobEmT7JqBogS` |
| Production | `prod_V1XEmmczEFTyqH` | `price_1U1UArCaBRQyrUgcHnSZTtBD` | `price_1U1UATCaBRQyrUgcBFjbhe0y` |

> The supplied Sandbox screenshot shows **Multiple capabilities paused** and two overdue required tasks. Open **View tasks** in Stripe and complete those requirements before testing Checkout. Correct Product and Price IDs cannot override an account-level capability restriction.

## 2. Configure the Founding Seller offer

The safe approach is a Stripe-managed promotion code, not a browser-controlled trial.

1. Stripe Dashboard → Product catalogue → Coupons → Create coupon.
2. Set **Percent off** to `100%` and **Duration** to `Forever`.
3. Limit it to the `HomeFood Pro` product.
4. Create the promotion code `FOUNDINGSELLER` for that coupon.
5. Set an expiration date and redemption limit matching the number of founding places available.
6. Distribute the code only to approved Founding Sellers.

Create and test `FOUNDINGSELLER` separately in Sandbox and Live mode. Stripe promotion codes are environment-specific, just like Products and Prices.

Checkout allows promotion codes and applies Stripe’s own restrictions. A valid 100%-off-forever code produces an active Pro subscription with a S$0 recurring total; transaction fees remain separate from this platform subscription.

## 3. Configure the Billing Portal

Stripe Dashboard → Settings → Billing → Customer portal:

1. Enable payment-method updates and invoice history.
2. Enable subscription cancellation, preferably **at the end of the billing period**.
3. Enable plan switching.
4. Add the monthly and yearly Prices from the same `HomeFood Pro` product.
5. Enable prorations according to the business policy you want Stripe to enforce.
6. Save the portal configuration in Test mode, then configure Live mode separately before launch.

The application deliberately does not calculate or execute plan-change prorations itself. Stripe owns that sensitive workflow.

## 4. Create the DynamoDB webhook-event table

Create one table in the same AWS region as the app. It prevents duplicate Stripe webhook deliveries from being processed twice.

```bash
aws dynamodb create-table \
  --table-name StripeWebhookEvents \
  --attribute-definitions AttributeName=event_id,AttributeType=S \
  --key-schema AttributeName=event_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-southeast-1

aws dynamodb wait table-exists \
  --table-name StripeWebhookEvents \
  --region ap-southeast-1

aws dynamodb update-time-to-live \
  --table-name StripeWebhookEvents \
  --time-to-live-specification Enabled=true,AttributeName=expires_at \
  --region ap-southeast-1
```

Add these permissions to the application IAM principal:

```json
[
  {
    "Effect": "Allow",
    "Action": ["dynamodb:GetItem"],
    "Resource": "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/Users"
  },
  {
    "Effect": "Allow",
    "Action": ["dynamodb:GetItem", "dynamodb:UpdateItem"],
    "Resource": "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/Shops"
  },
  {
    "Effect": "Allow",
    "Action": ["dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem"],
    "Resource": "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/StripeWebhookEvents"
  }
]
```

No new key or index is required on `Shops`. The webhook stores the verified projection there using these fields:

- `StripeCustomerID`
- `subscription_id`
- `subscription_created_at`
- `subscription_plan_key`
- `lookup_key` (legacy UI compatibility)
- `subscription_status`
- `subscription_entitled`
- `subscription_cancel_at_period_end`
- `subscription_current_period_end`
- `subscription_updated_at`

Do not manually set `subscription_entitled`. It is derived from the latest subscription retrieved directly from Stripe.

## 5. Set local environment variables

Copy `.env.template` to an ignored local file and replace all placeholders. Do not commit secrets.

```bash
cp .env.template .env.local
```

Required billing variables:

```dotenv
FRONTEND_BASE_URL=http://localhost:3001
APP_ALLOWED_ORIGINS=http://localhost:3001
STRIPE_BILLING_SECRET_KEY=sk_test_...
STRIPE_BILLING_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRODUCT_ID=prod_V1XP3ZyJ3SKA7J
STRIPE_PRO_MONTHLY_PRICE_ID=price_1U1ULJEF4MjhobEmKxBEoSvR
STRIPE_PRO_YEARLY_PRICE_ID=price_1U1UKsEF4MjhobEmT7JqBogS
STRIPE_WEBHOOK_EVENTS_TABLE=StripeWebhookEvents
```

`STRIPE_BILLING_SECRET_KEY` is intentionally separate from Stripe Connect payout credentials. Never expose it with a `NEXT_PUBLIC_` prefix.

## 6. Validate the Stripe configuration

Run the checker using the environment file:

```bash
node --env-file=.env.local scripts/verify-stripe-setup.mjs
```

It confirms that both Price IDs exist in the same Stripe account, are active recurring SGD prices, charge exactly S$47.88 monthly and S$478.80 yearly, and belong to the same Product. It prints IDs and mode, never secret values.

## 7. Test locally with signed webhooks

Install and authenticate the Stripe CLI, then use three terminals.

Terminal 1 — start the app on the requested port:

```bash
npm run dev -- --port 3001
```

Terminal 2 — forward only the events this integration handles:

```bash
stripe listen \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed \
  --forward-to http://localhost:3001/api/subscription/webhook
```

Copy the `whsec_...` printed by this command into `STRIPE_BILLING_WEBHOOK_SECRET` in `.env.local`, then restart Terminal 1. The CLI signing secret is different from a Dashboard webhook signing secret.

Terminal 3 or the browser:

1. Sign in as a shop **Owner** at `http://localhost:3001`.
2. Open `/app/subscription`.
3. Choose monthly or yearly Pro.
4. If testing Founding Seller, enter `FOUNDINGSELLER` on Stripe Checkout.
5. For a normal successful payment, use card `4242 4242 4242 4242`, any future expiry, any CVC and any postal code.
6. Finish Checkout and wait for the application’s verified success screen.

Expected results:

- Stripe CLI shows `200` for the webhook events.
- The success page says `SUBSCRIPTION ACTIVE` only after the server retrieves and verifies the Checkout Session and subscription.
- `Shops.subscription_entitled` is `true` only for Stripe status `active` or `trialing`.
- Re-sending the same webhook event returns `200` with no duplicate state transition.
- A second checkout request for an already active shop returns `409`.
- A Manager or Operator receives `403` when trying to create Checkout or Portal sessions.

To test signature rejection, send any unsigned JSON body:

```bash
curl -i -X POST http://localhost:3001/api/subscription/webhook \
  -H 'Content-Type: application/json' \
  --data '{"type":"checkout.session.completed"}'
```

The expected result is HTTP `400`. A `200` here means webhook verification is broken.

## 8. Configure the deployed webhook

In Stripe Workbench/Webhooks, create an HTTPS webhook destination using API version `2026-07-29.dahlia`:

```text
https://business.homefood.sg/api/subscription/webhook
```

Subscribe only to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Copy that destination’s `whsec_...` to the deployed `STRIPE_BILLING_WEBHOOK_SECRET`. Do not reuse the Stripe CLI secret or another endpoint’s secret.

For Vercel Production, set:

```dotenv
FRONTEND_BASE_URL=https://business.homefood.sg
APP_ALLOWED_ORIGINS=https://business.homefood.sg
STRIPE_BILLING_SECRET_KEY=sk_live_...
STRIPE_BILLING_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRODUCT_ID=prod_V1XEmmczEFTyqH
STRIPE_PRO_MONTHLY_PRICE_ID=price_1U1UArCaBRQyrUgcHnSZTtBD
STRIPE_PRO_YEARLY_PRICE_ID=price_1U1UATCaBRQyrUgcBFjbhe0y
STRIPE_WEBHOOK_EVENTS_TABLE=StripeWebhookEvents
```

Test and Live mode have separate Products, Prices, promotion codes, portal settings and webhook signing secrets. Recreate and verify each item in Live mode; never copy test Price IDs into production.

## 9. Security checklist before launch

- Run `node --env-file=.env.production.local scripts/verify-stripe-setup.mjs` against Live mode.
- Confirm the production origin is HTTPS and no localhost origin is allowed in Production.
- Confirm only Owners can open Checkout or Billing Portal.
- Confirm the Stripe Billing secret and Connect secret are separate variables.
- Confirm the webhook endpoint returns `400` for an invalid signature.
- Confirm duplicate event IDs exist only once in `StripeWebhookEvents`.
- Confirm the event table TTL is enabled on `expires_at`.
- Confirm the Billing Portal can switch monthly/yearly, update payment methods, show invoices and cancel at period end.
- Confirm a failed renewal removes Pro entitlement according to the intended policy; this implementation fails closed for `past_due`, `unpaid`, `incomplete`, `incomplete_expired`, `paused` and `canceled`.
- Never grant Pro based on the redirect URL, query string, local storage or browser response alone.

## References

- [Stripe subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Stripe webhook security and duplicate-event guidance](https://docs.stripe.com/webhooks)
- [Stripe Checkout Session API](https://docs.stripe.com/api/checkout/sessions/create)
- [Stripe Customer Portal configuration](https://docs.stripe.com/customer-management/configure-portal)
- [Stripe CLI local webhook testing](https://docs.stripe.com/stripe-cli/use-cli)
