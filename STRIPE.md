# Stripe documentation moved

The previous Stripe implementation and its setup instructions are retired.

Use [`STRIPE_SETUP_GUIDE.md`](./STRIPE_SETUP_GUIDE.md) for the current secure subscription architecture, required Stripe and DynamoDB configuration, local webhook testing, and production launch checklist.

Do not use the legacy `STRIPE_SECRET_KEY_LIVE` or `STRIPE_WEBHOOK_SECRET_KEY_LIVE` variables. The current billing integration uses `STRIPE_BILLING_SECRET_KEY` and `STRIPE_BILLING_WEBHOOK_SECRET`, kept separate from Stripe Connect credentials.
