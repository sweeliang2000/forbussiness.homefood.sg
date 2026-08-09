# Stripe Billing

Everything needed to run, test, and deploy HomeFood Pro subscriptions.

- [How it works](#how-it-works)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Stripe account setup](#stripe-account-setup)
- [AWS setup](#aws-setup)
- [Local webhook testing](#local-webhook-testing)
- [Deploying](#deploying)
- [Reference: entitlement and the webhook ledger](#reference-entitlement-and-the-webhook-ledger)
- [Troubleshooting](#troubleshooting)
- [Pre-launch checklist](#pre-launch-checklist)

---

## How it works

Stripe Checkout starts a subscription, the Stripe Billing Portal handles every later change, signed webhooks provision access, and DynamoDB holds a local projection of the subscription. HomeFood never receives or stores card details.

The browser can request only `pro_monthly` or `pro_yearly`. It cannot send a Price ID, lookup key, amount, coupon, trial duration, customer ID, or shop ID. The authenticated Cognito identity is resolved against the `Users` table before any billing action.

> **Legacy variables.** `STRIPE_SECRET_KEY_LIVE` and `STRIPE_WEBHOOK_SECRET_KEY_LIVE` are retired — do not use them. Billing uses `STRIPE_BILLING_SECRET_KEY` and `STRIPE_BILLING_WEBHOOK_SECRET`, deliberately separate from Stripe Connect payout credentials.

**The webhook is the only thing that grants access.** There is no polling and no lazy re-check on read. If webhook delivery is broken, a merchant can pay successfully, see Stripe's receipt, and still be treated as a free account indefinitely. Webhook delivery failures are silent revenue bugs — watch them in the Stripe dashboard.

---

## Quick start

Getting a local subscription working end to end, from nothing.

```bash
cp .env.template .env.local
```

Fill in the billing variables ([below](#environment-variables)). Note that `.env.template` ships with port **3001** while `npm run dev` serves on **3000** — pick one and make `FRONTEND_BASE_URL`, `APP_ALLOWED_ORIGINS`, and your `stripe listen` target all agree. This guide assumes 3000.

Confirm the Stripe side is sane before touching the app:

```bash
node --env-file=.env.local scripts/verify-stripe-setup.mjs
```

Terminal 1 — the app:

```bash
npm run dev
```

Terminal 2 — forward webhooks (do **not** prefix with `sudo`; it reads a different `~/.config/stripe` and may not be authenticated as you):

```bash
stripe listen --forward-to http://localhost:3000/api/subscription/webhook

stripe listen --events checkout.session.completed,checkout.session.expired,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed --forward-to http://localhost:3000/api/subscription/webhook
```

Copy the `whsec_...` it prints into `STRIPE_BILLING_WEBHOOK_SECRET` and **restart terminal 1**. The CLI signing secret is not the same as a Dashboard webhook signing secret.

Then in the browser: sign in as a shop **Owner**, open `/app/subscription`, pick a plan, and pay with `4242 4242 4242 4242`, any future expiry, any CVC, any postal code.

---

## Environment variables

```dotenv
FRONTEND_BASE_URL=http://localhost:3000
APP_ALLOWED_ORIGINS=http://localhost:3000
STRIPE_BILLING_SECRET_KEY=sk_test_...
STRIPE_BILLING_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRODUCT_ID=prod_V1XP3ZyJ3SKA7J
STRIPE_PRO_MONTHLY_PRICE_ID=price_1U1ULJEF4MjhobEmKxBEoSvR
STRIPE_PRO_YEARLY_PRICE_ID=price_1U1UKsEF4MjhobEmT7JqBogS
STRIPE_WEBHOOK_EVENTS_TABLE=StripeWebhookEvents
SHOPS_TABLE=Shops
```

`STRIPE_BILLING_SECRET_KEY` must never carry a `NEXT_PUBLIC_` prefix.

`SHOPS_TABLE` and `STRIPE_WEBHOOK_EVENTS_TABLE` both have code defaults (`Shops`, `StripeWebhookEvents`), so leaving them unset works — but if you *do* set them per-environment, the IAM policy has to name the same tables.

AWS credentials come from `APP_AWS_ACCESS_KEY_ID` / `APP_AWS_SECRET_ACCESS_KEY` / `APP_AWS_REGION` in `.env.local`. The app passes these explicitly and never uses the default provider chain, so **`~/.aws/credentials` is a different identity than the app's**. When debugging with the CLI, borrow the app's:

```bash
set -a; source .env.local; set +a; export AWS_ACCESS_KEY_ID="$APP_AWS_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$APP_AWS_SECRET_ACCESS_KEY" AWS_DEFAULT_REGION="$APP_AWS_REGION"; aws sts get-caller-identity
```

---

## Stripe account setup

Do all local testing in **Sandbox / Test mode** first. Test and Live mode have separate Products, Prices, promotion codes, portal settings, and webhook signing secrets. Recreate each in Live mode; never copy test Price IDs into production.

### Product and prices

Both Prices must live on the **same Product** so the Billing Portal can switch between them.

| Environment | Product | Monthly — S$47.88 | Yearly — S$478.80 |
| --- | --- | --- | --- |
| Sandbox | `prod_V1XP3ZyJ3SKA7J` | `price_1U1ULJEF4MjhobEmKxBEoSvR` | `price_1U1UKsEF4MjhobEmT7JqBogS` |
| Production | `prod_V1XEmmczEFTyqH` | `price_1U1UArCaBRQyrUgcHnSZTtBD` | `price_1U1UATCaBRQyrUgcBFjbhe0y` |

To create them fresh: Dashboard → Product catalogue → Add product, name it `HomeFood Pro`, add a recurring SGD monthly Price at S$47.88, then a second recurring SGD yearly Price at S$478.80 on the same Product.

### Founding Seller offer

A Stripe-managed promotion code, not a browser-controlled trial:

1. Product catalogue → Coupons → Create coupon.
2. **Percent off** `100%`, **Duration** `Forever`.
3. Limit it to the `HomeFood Pro` product.
4. Create promotion code `FOUNDINGSELLER` for that coupon.
5. Set an expiry and a redemption limit matching the number of founding places.

Checkout accepts promotion codes and applies Stripe's own restrictions. A valid 100%-off-forever code yields an active Pro subscription with a S$0 recurring total. Transaction fees are separate from this platform subscription.

### Billing Portal

Settings → Billing → Customer portal: enable payment-method updates, invoice history, cancellation (preferably at period end), and plan switching. Add both Prices from the same Product, and set prorations to the policy you want Stripe to enforce.

The application deliberately does not calculate or execute plan-change prorations. Stripe owns that workflow.

---

## AWS setup

### Webhook ledger table

One table, same region as the app. It stops duplicate Stripe deliveries being processed twice.

```bash
aws dynamodb create-table --table-name StripeWebhookEvents --attribute-definitions AttributeName=event_id,AttributeType=S --key-schema AttributeName=event_id,KeyType=HASH --billing-mode PAY_PER_REQUEST --region ap-southeast-1
```

```bash
aws dynamodb wait table-exists --table-name StripeWebhookEvents --region ap-southeast-1
```

```bash
aws dynamodb update-time-to-live --table-name StripeWebhookEvents --time-to-live-specification Enabled=true,AttributeName=expires_at --region ap-southeast-1
```

### IAM

The app principal needs these actions. **`StripeWebhookEvents` is easy to forget** — omitting it produces `AccessDeniedException` on every webhook, and the events are simply lost.

```json
[
  {
    "Effect": "Allow",
    "Action": ["dynamodb:GetItem", "dynamodb:Query"],
    "Resource": "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/Users"
  },
  {
    "Effect": "Allow",
    "Action": ["dynamodb:GetItem", "dynamodb:UpdateItem"],
    "Resource": "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/Shops"
  },
  {
    "Effect": "Allow",
    "Action": ["dynamodb:GetItem", "dynamodb:UpdateItem"],
    "Resource": "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/StripeWebhookEvents"
  }
]
```

`UpdateItem` is the only action the ledger needs at runtime; `GetItem` is for debugging. In this project these are folded into the shared `DynamoDBTables` statement rather than kept separate.

No new key or index is required on `Shops`.

---

## Local webhook testing

Beyond the [quick start](#quick-start), verify these:

- Stripe CLI shows `200` for each forwarded event.
- The success page reads **"You're on Pro"** only after the server retrieves and verifies the Checkout Session and subscription.
- `Shops.subscription_entitled` is `true` only for Stripe status `active` or `trialing`.
- Re-sending the same event returns `200` with `duplicate: true` and no second state transition.
- A second checkout for an already-active shop returns `409`.
- A Manager or Operator gets `403` from Checkout and Portal creation.

> **A `200` does not always mean "processed".** The handler returns `200 {ignored: true}` for event types it doesn't subscribe to, and `200 {failed: true}` for permanent failures it refuses to have Stripe retry. Read the body, and check the ledger row.

Signature rejection — any unsigned body must yield `400`:

```bash
curl -i -X POST http://localhost:3000/api/subscription/webhook -H 'Content-Type: application/json' --data '{"type":"checkout.session.completed"}'
```

A `200` here means verification is broken.

---

## Deploying

In Stripe Workbench → Webhooks, create an HTTPS destination:

```text
https://business.homefood.sg/api/subscription/webhook
```

Subscribe to exactly these seven events — the handler ignores everything else, and extra subscriptions are pure noise:

`checkout.session.completed`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`

Copy that destination's `whsec_...` into the deployed `STRIPE_BILLING_WEBHOOK_SECRET`. Do not reuse the Stripe CLI secret or another endpoint's secret.

Production environment:

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

---

## Reference: entitlement and the webhook ledger

### How access is decided

Entitlement is read from **DynamoDB, not Stripe**. `hasProEntitlement` checks two fields on the shop row:

```js
Boolean(shop?.subscription_entitled) && ['active', 'trialing'].includes(shop?.subscription_status)
```

Stripe is consulted live in only three places: before creating a Checkout (to block double-subscribing), a one-time self-heal for rows predating the current flow, and the return-from-checkout page (so the success screen doesn't race the webhook).

### Fields written to `Shops`

`StripeCustomerID`, `subscription_id`, `subscription_created_at`, `subscription_plan_key`, `lookup_key` (legacy UI compatibility), `subscription_status`, `SubscriptionStatus` and `StripeCustomerSubscriptionStatus` (legacy mirrors), `subscription_entitled`, `subscription_cancel_at_period_end`, `subscription_current_period_end`, `subscription_updated_at`.

Transient checkout state — `subscription_checkout_lock`, `subscription_checkout_lock_expires_at`, `subscription_checkout_session_id` — is cleared by the same write.

**Never set `subscription_entitled` by hand.** It is derived from the subscription retrieved directly from Stripe.

### Ledger states in `StripeWebhookEvents`

| `processing_status` | Meaning | Reclaimable by a retry? |
| --- | --- | --- |
| `processing` | In flight, holding a 5-minute lease | Only once the lease expires |
| `complete` | Done | No |
| `failed_transient` | Failed; a retry may succeed | Yes, immediately |
| `failed_permanent` | Will fail identically forever; needs a human | No |

Alongside: `attempts`, `last_error`, `last_error_at`, `lease_expires_at`, `first_received_at`, `received_at`, `completed_at`, `shop_id`, `livemode`, `expires_at` (90-day TTL).

Find everything needing attention:

```bash
aws dynamodb scan --table-name StripeWebhookEvents --filter-expression "processing_status = :s" --expression-attribute-values '{":s":{"S":"failed_permanent"}}'
```

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `connection refused` on `stripe listen` | Forwarding to a port nothing serves — often the sample-app default `4242/webhook` | Forward to `http://localhost:3000/api/subscription/webhook`, and start the dev server first |
| Every webhook `400` | `STRIPE_BILLING_WEBHOOK_SECRET` doesn't match the endpoint sending the event | Copy the secret the *current* `stripe listen` printed, restart the dev server |
| `AccessDeniedException ... dynamodb:UpdateItem ... StripeWebhookEvents` | Table missing from the IAM policy | Add its ARN ([IAM](#iam)) |
| `No such customer: 'cus_...'` | Customer deleted in Stripe, id still on the shop row | Clear `StripeCustomerID` — but see the idempotency note below |
| Cleared `StripeCustomerID`, still the *same* dead `cus_...` | Customer creation uses `idempotencyKey: homefood-customer-<shop_id>`; Stripe replays the original response for 24h | Set `StripeCustomerID` to a customer you create manually (this skips the create call entirely), use a different shop, or wait out the window |
| Checkout 502s and never recovers | A stale `subscription_checkout_session_id` points at a *completed* session, so every attempt re-enters the recovery path — and the projection write that would clear it is the thing failing | Clear the checkout attributes (see reset below) |
| Success page 404s on `/api/data/shopSubscriptionStatus` | The user's `shop_id` has no row in `Shops` | Reconcile `Users` and `Shops`; the endpoint 404s by design because `getAuthoritativeUser` guarantees the id exists |

### Resetting a test shop

Dump the row first — once cleared, the evidence is gone:

```bash
aws dynamodb get-item --consistent-read --table-name Shops --key '{"shop_id":{"S":"YOUR_SHOP_ID"}}'
```

```bash
aws dynamodb update-item --table-name Shops --key '{"shop_id":{"S":"YOUR_SHOP_ID"}}' --update-expression "REMOVE StripeCustomerID, subscription_id, subscription_created_at, subscription_plan_key, lookup_key, SubscriptionStatus, StripeCustomerSubscriptionStatus, subscription_status, subscription_entitled, subscription_cancel_at_period_end, subscription_current_period_end, subscription_updated_at, subscription_checkout_lock, subscription_checkout_lock_expires_at, subscription_checkout_session_id"
```

Clear all of them together, not just the plan key: leaving `StripeCustomerID` behind while the next checkout mints a *different* customer makes the projection write fail its guard, and the webhook fails with nothing in the row explaining why.

Then also: cancel the subscription in Stripe test mode (it will otherwise keep emitting webhooks that rewrite what you just cleared), and clear `shopSubscriptionStatus` from browser localStorage.

To replay an event you already processed, delete its `event_id` row — `acquireWebhookEvent` dedupes on it.

---

## Pre-launch checklist

- [ ] `node --env-file=.env.production.local scripts/verify-stripe-setup.mjs` passes against Live mode.
- [ ] Production origin is HTTPS; no localhost origin allowed in Production.
- [ ] Only Owners can open Checkout or the Billing Portal.
- [ ] Billing secret and Connect secret are separate variables.
- [ ] Webhook endpoint returns `400` for an invalid signature.
- [ ] `StripeWebhookEvents` is in the IAM policy and TTL is enabled on `expires_at`.
- [ ] Duplicate event IDs appear only once in the ledger.
- [ ] Billing Portal can switch monthly/yearly, update payment methods, show invoices, cancel at period end.
- [ ] A failed renewal removes Pro entitlement. This implementation fails closed for `past_due`, `unpaid`, `incomplete`, `incomplete_expired`, `paused`, `canceled`.
- [ ] Pro is never granted from the redirect URL, query string, localStorage, or browser response alone.

---

## References

- [Stripe subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Stripe webhook security and duplicate-event guidance](https://docs.stripe.com/webhooks)
- [Stripe Checkout Session API](https://docs.stripe.com/api/checkout/sessions/create)
- [Stripe Customer Portal configuration](https://docs.stripe.com/customer-management/configure-portal)
- [Stripe CLI local webhook testing](https://docs.stripe.com/stripe-cli/use-cli)
- [Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
