# Stripe and the backend migration

What moving the Express backend into `src/app/api` means for Stripe: what already works, what
still has to be done by hand, and what will bite you.

**Scope.** This is about the *migration*. The two-plan pricing model — products, prices, the
early-adopter coupon, portal configuration, migrating existing subscribers — is a separate
document: `readme_update_stripe.md` at the workspace root. Nothing here changes the pricing model.

---

## Status at a glance

| | |
|---|---|
| Routes ported | 13 of 13 ✅ |
| Webhook receives an unparsed body | ✅ |
| Clients constructed lazily (build-safe) | ✅ |
| Register the new webhook endpoint | ❌ **you must do this** |
| Regenerate the webhook signing secret | ❌ **you must do this** |
| Decide whether the two secret keys are one account | ❌ **you must do this** |
| Redirect URLs work on Preview deploys | ❌ known gap |
| Menu→product sync survives a large menu | ⚠️ deferred |

---

## Done

### All 13 Stripe routes moved

```
/api/subscription/webhook                  ← public, raw body
/api/subscription/create-checkout-session
/api/subscription/create-portal-session
/api/subscription/preview-upgrade
/api/subscription/upgrade
/api/subscription/downgrade
/api/subscription/cancel-schedule
/api/subscription/upgrade-status
/api/subscription/end-date
/api/stripe-connect/create-connect-account   ← Owner only
/api/stripe-connect/create-account-link      ← Owner only
/api/stripe-connect/account-status           ← Owner only
/api/stripe-connect/dashboard-link           ← Owner only
```

Paths are unchanged, so no frontend call site moved. Handler logic is unchanged too — the same
`stripe.subscriptions.update`, `stripe.subscriptionSchedules.*`, `stripe.invoices.createPreview`
calls as before.

### Clients are lazy now

The Express version did this at module load:

```js
const stripeSecretKey = process.env.STRIPE_SECRET_KEY_LIVE;
if (!stripeSecretKey || !stripe_webhookSecret) throw new Error(...)
```

Fine for a server that either boots or doesn't. Fatal in Next: that module is transitively imported
by ~90 route files, so webpack evaluates it during `next build`'s module-graph pass — a missing key
would have failed the *build*, not the request. `src/lib/server/stripe.js` exposes `getStripe()`,
`getConnectStripe()` and `getWebhookSecret()` instead, all resolving on first use.

You can prove it: `npx next build` succeeds with no Stripe variables set at all.

### The webhook still gets raw bytes

Signature verification is over the exact bytes Stripe sent, so any re-encoding breaks it silently —
the endpoint would 400 every event and subscription state would quietly stop updating.

The route declares `body: 'raw'`, and `parseBody` uses `request.arrayBuffer()` (**not** `.text()`,
which would impose an encoding round-trip). `handleStripeWebhook` already did
`Buffer.isBuffer(req.body) ? ... ` and read `req.headers['stripe-signature']`, both of which the
adapter supplies — so the handler itself is byte-for-byte unchanged.

⚠️ Never call `request.json()` anywhere on this path.

All six events still handled: `customer.subscription.trial_will_end`, `customer.subscription.updated`,
`customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`,
`checkout.session.completed`.

### State still lives in DynamoDB

Unchanged by the migration, listed because it's easy to forget these are Stripe's system of record
here:

- **`Shops`** — `StripeCustomerID`, `subscription_id`, `lookup_key`,
  `StripeCustomerSubscriptionStatus`, `SubscriptionStatus`, `LastUpgradePaymentStatus`,
  `StripeConnectAccountId`
- **`Stripe-Invoices`** — flattened invoice archive written by `invoice.paid`
- **`payment_failed_emails_sent`** — partition key `invoice_id`. The *only* thing stopping a
  merchant getting the same payment-failure email repeatedly. If this table is missing, the code
  logs and carries on rather than failing, so a silent absence means duplicate emails, not an error.

Live lookup keys remain `homefood_pro_monthly` and `homefood_pro_yearly`. `homefood_free` is a local
sentinel and deliberately not a Stripe object — a shop is on Free precisely when it has no active
subscription.

---

## To do

### 1. Register the new webhook endpoint

Do this in the cutover phase, **before ECS is switched off**, and run both endpoints in parallel for
24 hours.

1. Stripe Dashboard → Developers → Webhooks → **Add endpoint**
2. URL: `https://business.homefood.sg/api/subscription/webhook`
3. Select exactly the six events listed above
4. Copy the new signing secret into `STRIPE_WEBHOOK_SECRET_KEY_LIVE`

⚠️ **A new endpoint gets a new signing secret.** The existing value will not validate against the
new URL. Reuse it and every webhook 400s — checkout completions stop writing back, subscription
upgrades never reflect, and nothing surfaces an error to the merchant. This is the single most
likely way to break billing during the migration.

Confirm events are arriving and the DynamoDB writes match, then delete the old
`api.bus.collbine.com` endpoint.

### 2. Resolve the two secret keys

The codebase has always used two:

| Variable | Used by | Where |
|---|---|---|
| `STRIPE_SECRET_KEY_LIVE` | subscriptions, checkout, portal, webhook | `getStripe()` |
| `STRIPE_SECRET_KEY` | Connect: onboarding, payouts, menu→product sync | `getConnectStripe()` |

Nobody has confirmed whether these are the same account. It matters: **if `STRIPE_SECRET_KEY` is a
test key, merchant Connect onboarding has been running in test mode**, and merging the two would
change live behaviour rather than tidy it.

Don't guess — ask the deployment:

```bash
curl -H "x-selftest-secret: $APP_SELFTEST_SECRET" https://<deployment>/api/selftest
```

Read `stripe.platform`, `stripe.connect` and `stripe.sameAccount`. It reports key *prefixes*
(`sk_live_` / `sk_test_`) and account IDs only, never values. If both are live and the same `acct_`,
collapse to one variable and delete `STRIPE_SECRET_KEY`. Otherwise keep both and find out why they
differ.

(The old backend exposed `GET /api/subscription/webhook-config`, which returned the first 20
characters of the live secret key to anyone who asked, unauthenticated. It was deliberately not
ported. Consider pulling it from the running ECS service now rather than at teardown.)

### 3. Set the environment variables

In Vercel, for **Production, Preview and Development**:

```
STRIPE_SECRET_KEY_LIVE=
STRIPE_WEBHOOK_SECRET_KEY_LIVE=     # regenerated, see step 1
STRIPE_SECRET_KEY=                  # Connect; may collapse into the above after step 2
FRONTEND_BASE_URL=https://business.homefood.sg
```

---

## Known gaps

### Checkout and portal redirects are hardcoded to production

```
src/lib/server/controllers/Authentication.js:3665  success_url: https://business.homefood.sg/app/setting?success=true...
src/lib/server/controllers/Authentication.js:3666  cancel_url:  https://business.homefood.sg/app/setting?canceled=true
src/lib/server/controllers/Authentication.js:3729  returnUrl:   https://business.homefood.sg/app/setting
```

Pre-existing, not caused by the migration — but it matters more now, because Preview deployments are
a normal part of the workflow. **Testing checkout on a Preview URL will bounce the user to
production**, where their session cookie may not exist and the result looks like a broken payment.

Stripe Connect does this correctly already (`stripeConnect.js:74-81` reads `FRONTEND_BASE_URL`), so
the fix is to make these three do the same.

Minor, same file: `stripeConnect.js:14` imports `FRONTEND_BASE_URL` from `../env` but line 74 reads
`process.env.FRONTEND_BASE_URL` directly. Behaviour is identical; the import is dead.

### Menu→Stripe product sync can outrun the function timeout

`publishMenuUpdate` still calls `syncMenuToStripeProducts` inline
(`Authentication.js:3122-3132`). That function pages through **every** active product and price on
the connected account, then issues up to three writes per menu item plus an archival pass. At
roughly 1–2s per item, a 200-item menu exceeds even Vercel Pro's 300s ceiling.

It is already best-effort — wrapped in try/catch, its status returned as `stripeProductSync`, with
the original comment noting "a failure here must not unpublish the menu; the next publish re-syncs
from scratch." So a timeout degrades rather than corrupts.

Deferred deliberately. **Revisit when either trips:** a merchant menu passes ~60 items, or a publish
exceeds ~120s in the Vercel logs. The design when you do — a resumable, cursor-driven
`POST /api/data/publish/menu/stripe-sync` backed by a `shops.stripe_sync_state` jsonb column — is in
the migration plan, §6.

The S3 half of publish *has* been parallelised, so photo copying is no longer the bottleneck.

---

## Verifying it works

**Locally**, against the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/subscription/webhook
```

Then in another terminal, `stripe trigger checkout.session.completed`. Expect a 200 and a
corresponding `Shops` write.

**The test that actually matters** is the negative one: send a request with a tampered
`Stripe-Signature` and confirm it returns **400**. That proves the raw body survived the adapter.
A 200 here means signature verification is being skipped and anyone can forge subscription state.

**On Preview**, use the Dashboard's "Send test webhook". Note the redirect caveat above before
attempting a full checkout flow.

**Before going live**, work through §7 "Test checklist" of `readme_update_stripe.md` — it covers the
plan-level behaviour (upgrade proration, downgrade scheduling, the early-adopter coupon) that this
document deliberately doesn't repeat.
