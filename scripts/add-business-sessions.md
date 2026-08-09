# BusinessSessions — session registry setup

Run this **before** deploying the session work, not after. `verifyToken` reads
this table on every authenticated request, so until the table exists and IAM
allows it, every signed-in request fails.

Read `src/lib/server/sessions.js` for why this lives in DynamoDB rather than
Supabase alongside the audit log: it's a point read on every request and the
rows need to expire on their own.

## 1. Create the table

```bash
aws dynamodb create-table \
  --table-name BusinessSessions \
  --attribute-definitions \
      AttributeName=session_id,AttributeType=S \
      AttributeName=user_id,AttributeType=S \
  --key-schema AttributeName=session_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[{
      "IndexName": "user_id-index",
      "KeySchema": [{"AttributeName": "user_id", "KeyType": "HASH"}],
      "Projection": {"ProjectionType": "ALL"}
  }]' \
  --region ap-southeast-1
```

The GSI is what lists one member's devices. Without it the only way to find a
user's sessions is a full scan.

## 2. Enable TTL

```bash
aws dynamodb update-time-to-live \
  --table-name BusinessSessions \
  --time-to-live-specification Enabled=true,AttributeName=expires_at \
  --region ap-southeast-1
```

**This is the retention policy.** `expires_at` is set to seven days out at
login, matching the refresh cookie, so a dead session — and the IP address in
it — is deleted by DynamoDB without a cleanup job. This is the reason the
equivalent Postgres `pg_cron` scrub is no longer needed.

TTL deletion is not instant; AWS typically removes items within 48 hours of
expiry. That's fine — `isLive()` already treats a past `expires_at` as dead, so
an unswept row is never honoured.

## 3. Add to the IAM policy

Nothing works until this lands. Extend the `DynamoDBTables` statement:

```
arn:aws:dynamodb:ap-southeast-1:123456789012:table/BusinessSessions
```

and the `DynamoDBIndexes` statement:

```
arn:aws:dynamodb:ap-southeast-1:123456789012:table/BusinessSessions/index/user_id-index
```

The existing actions are enough — `GetItem`, `PutItem`, `UpdateItem` and
`Query` are all this uses. It never deletes; TTL does that.

## 4. Verify

```bash
aws dynamodb describe-table --table-name BusinessSessions \
  --region ap-southeast-1 --query 'Table.[TableStatus,GlobalSecondaryIndexes[0].IndexStatus]'
```

Both should read `ACTIVE`. Then log in and confirm a row appears:

```bash
aws dynamodb scan --table-name BusinessSessions --limit 5 --region ap-southeast-1
```

## Note on deploy

Everyone signed in at deploy time is logged out, by design — their browsers
have no `sid` cookie and `verifyToken` fails closed. That's what makes the
session list trustworthy from the first day rather than showing a partial
picture for a week. Worth timing outside service hours.
