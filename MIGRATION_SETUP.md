# Migration setup — what to create by hand

> **Stripe subscription setup has been superseded.** Ignore the Stripe sections and legacy Stripe environment-variable names in this migration record. Follow [`STRIPE_SETUP_GUIDE.md`](./STRIPE_SETUP_GUIDE.md) for the current billing implementation.

Everything in this file has to be done in a console (AWS, Stripe, Supabase, Vercel). It's the
manual prerequisite for the code migration; do it before Phase 1.

**Account:** `123456789012` · **Region:** `ap-southeast-1`

---

## The short version

You are **not** creating much. The migration keeps every existing AWS data service and deletes
only the compute layer. The one genuinely new AWS resource is an IAM user, because the old backend
got its credentials implicitly from the ECS task role and that role is going away.

| # | What | Where | New? |
|---|---|---|---|
| 1 | IAM user `homefood-vercel-api` + access key | AWS IAM | **NEW** |
| 2 | CORS rules on 3 S3 buckets | AWS S3 | config change |
| 3 | Webhook endpoint at the new URL | Stripe | **NEW** |
| 4 | `shops.stripe_sync_state` column | Supabase | **NEW** (only if you build the deferred Stripe-sync split) |
| 5 | ~23 environment variables | Vercel | mostly renames |

**Nothing gets deleted until Phase 9–10**, after the new API is proven in production.

---

## 1. IAM user `homefood-vercel-api`

AWS Console → IAM → Users → Create user. **No console access**, programmatic only. Attach the
inline policy below, then create an access key (use case: "Application running outside AWS") and
put the pair into `APP_AWS_ACCESS_KEY_ID` / `APP_AWS_SECRET_ACCESS_KEY`.

Why this is needed: grep the old backend and you'll find no `AWS_ACCESS_KEY_ID` anywhere — ECS
injected credentials via the task role. Vercel has no equivalent, so the credentials become
explicit.

<details>
<summary>Least-privilege policy JSON (click to expand)</summary>

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3DraftBucketsReadWrite",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": [
        "arn:aws:s3:::collbine-forbusiness-shop-images/*",
        "arn:aws:s3:::collbine-forbusiness-reward-images/*",
        "arn:aws:s3:::collbine-forbusiness-menus/*"
      ]
    },
    {
      "Sid": "S3LiveBucketWriteOnlyForPublish",
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::collbine-shop-images-live/*"
    },
    {
      "Sid": "DynamoDBTables",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Users",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Shops",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/businessinformations",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/CustomerFacingDetails",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Menus",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/StampData",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Card_Design",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/qr_code",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/qr_configuration",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/redemption_code",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/query",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/invitedUser",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/userBackup",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Rewards",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/qr_reward_daily_counts",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/qr_reward_redeemed_count",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/shop_daily_unique_customers",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/shop_release_contact",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/review_customer_release",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Scheduled_Accepted_Customer_Review",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Rejected_Customer_Review",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/ReleaseHistory",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Order_Settings",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Order_Calendar_Override",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Payment_Settings",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Stripe-Invoices",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/payment_failed_emails_sent"
      ]
    },
    {
      "Sid": "DynamoDBIndexes",
      "Effect": "Allow",
      "Action": ["dynamodb:Query", "dynamodb:Scan"],
      "Resource": [
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/Users/index/shop_id-index",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/invitedUser/index/shop_id-index",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/invitedUser/index/email-index",
        "arn:aws:dynamodb:ap-southeast-1:123456789012:table/qr_code/index/shop_id-index"
      ]
    },
    {
      "Sid": "CognitoAdminSignOutOnly",
      "Effect": "Allow",
      "Action": ["cognito-idp:AdminUserGlobalSignOut"],
      "Resource": "arn:aws:cognito-idp:ap-southeast-1:123456789012:userpool/ap-southeast-1_EXAMPLE"
    },
    {
      "Sid": "SESSendOnly",
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "arn:aws:ses:ap-southeast-1:123456789012:identity/sender@example.com"
    }
  ]
}
```

</details>

Four things worth understanding about this policy:

- **There is no `dynamodb:TransactWriteItems` action** — IAM rejects it as invalid. DynamoDB
  authorizes a transaction by its *constituent* operations instead. The three
  `TransactWriteItemsCommand` calls in `acceptInvitation` use only `Update`, `Delete` and `Put`
  against `Users`, `invitedUser` and `userBackup`, so the `UpdateItem`/`DeleteItem`/`PutItem` grants
  above already cover them. (A transaction containing a `ConditionCheck` would additionally need
  `dynamodb:ConditionCheckItem`; none currently does, so it isn't granted.)
- **The live bucket is write-only.** `collbine-shop-images-live` gets `PutObject` but not
  `GetObject`, because publish only ever copies *into* it. `CopyObject` needs read on the source
  and write on the destination, and the sources are the three draft buckets — which already have
  `GetObject` in the first statement.
- **`s3:ListBucket` is not granted**, so bucket-level operations like `HeadBucket` and `ListObjects`
  will 403. Nothing in the app needs them; `/api/selftest` deliberately probes with a `HeadObject`
  on a nonexistent key instead, where a `404` proves reachability and authorization while a `403`
  means the policy is wrong.
- **Cognito needs almost nothing.** Only `AdminUserGlobalSignOut` requires IAM. SignUp,
  InitiateAuth, ConfirmSignUp, ResendConfirmationCode, ForgotPassword and ConfirmForgotPassword are
  *unauthenticated* Cognito APIs — they're called with the app client ID, not with AWS credentials.

If a call fails with `AccessDenied` after this, the error names the specific action — add that one
rather than reaching for a broader managed policy.

---

## 2. S3 CORS on the three upload buckets

Needed because the browser will start PUTting directly to S3 via presigned URLs (migration Phase 6)
instead of proxying bytes through the server. Without CORS the preflight fails and every upload
breaks.

Apply to **`collbine-forbusiness-shop-images`**, **`collbine-forbusiness-reward-images`** and
**`collbine-forbusiness-menus`**. (Not to `collbine-shop-images-live` — nothing uploads there from a
browser.)

S3 Console → bucket → Permissions → Cross-origin resource sharing (CORS) → Edit:

```json
[
  {
    "AllowedOrigins": [
      "https://business.homefood.sg",
      "https://*.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

`https://*.vercel.app` covers preview deployments. Drop it once you stop testing uploads on
previews.

---

## 3. Stripe webhook endpoint

Do this in **Phase 8, before ECS is turned off**, and run both endpoints in parallel for 24 hours.

1. Stripe Dashboard → Developers → Webhooks → **Add endpoint**
2. URL: `https://business.homefood.sg/api/subscription/webhook`
3. Events — exactly the six the handler processes:
   `customer.subscription.trial_will_end`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`,
   `checkout.session.completed`
4. Copy the new **signing secret** into `STRIPE_WEBHOOK_SECRET_KEY_LIVE`.

⚠️ **A new endpoint gets a new signing secret.** The existing value will not validate against the
new URL — reusing it means every webhook 400s and subscription state silently stops updating.

Confirm events are arriving at the new endpoint and the DynamoDB writes match, then delete the old
`api.bus.collbine.com` endpoint.

**While you're in the dashboard,** check whether `STRIPE_SECRET_KEY` and `STRIPE_SECRET_KEY_LIVE`
belong to the same account. The old backend uses them for different things (Connect vs
subscriptions) and if `STRIPE_SECRET_KEY` turns out to be a *test* key, merchant Connect onboarding
has been running in test mode. `/api/_selftest` reports both key prefixes and account IDs — use
that rather than guessing.

---

## 4. Supabase

Only needed if you build the deferred Stripe-sync split (migration plan §6):

```sql
ALTER TABLE shops ADD COLUMN IF NOT EXISTS stripe_sync_state jsonb;
```

---

## 5. Vercel

- **Plan:** Pro. Two reasons — `maxDuration` goes from 60s to 300s, which the publish endpoints
  need; and the Hobby plan is for non-commercial projects, which this isn't.
- **Environment variables:** everything in `.env.template`, set for **Production, Preview and
  Development**. Preview needs them too or the golden-diff verification harness has nothing to test
  against.
- **Do not set `NODE_ENV`.** Vercel manages it. It is `production` for both Production and Preview
  builds.
- Vercel will reject any variable named `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` or
  `AWS_REGION` — that's the reserved namespace, and the reason for the `APP_` prefix.

---

## 6. Teardown — Phase 10 only, after the new API is proven

**Delete:**

- ECS service and cluster
- The ALB and its target groups
- ECR repo `123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/collbine-business-authentication`
- DNS record for `api.bus.collbine.com`

Keep the ECS task definition and the last ECR image for ~2 weeks as a rollback path.

**Keep — these are the data layer, not the compute layer:**

- Cognito user pool `ap-southeast-1_EXAMPLE` (deleting it deletes every merchant login)
- All 27 DynamoDB tables
- All 4 S3 buckets
- CloudFront distribution `d1qms1ms25las5.cloudfront.net`
- The SES verified identity

### What this actually saves

ECS Fargate + ALB + ECR is roughly **$40–60/month of fixed cost**, and it's essentially all of the
AWS bill. What remains — DynamoDB on-demand, S3, Cognito (free below 50k monthly active users),
SES ($0.10 per 1,000 emails) — is single-digit dollars at this volume. Net of Vercel Pro at $20/mo,
the migration still comes out ahead, and it removes a deploy pipeline, a Dockerfile and a CORS
configuration from the system.
