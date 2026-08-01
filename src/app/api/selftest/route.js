import { NextResponse } from 'next/server';
import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { HeadObjectCommand } from '@aws-sdk/client-s3';

import { getDynamo, getS3 } from '@/lib/server/aws';
import { getSupabase } from '@/lib/server/supabase';
import { getStripe, getConnectStripe } from '@/lib/server/stripe';
import { BUCKETS } from '@/lib/server/s3-keys';
import { APP_AWS_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID } from '@/lib/server/env';

/**
 * TEMPORARY — delete once the migration is complete.
 *
 * Proves, from inside a real Vercel function, that every external dependency is
 * reachable with the credentials configured for this environment. Existed
 * because "it works locally" says nothing about whether the IAM user's policy is
 * right, and because a wrong Stripe key is otherwise invisible until a merchant
 * hits it.
 *
 * Reports key prefixes and account identifiers only. Never secret values —
 * the endpoint it replaces (GET /api/subscription/webhook-config on the old
 * backend) returned the first 20 characters of the live Stripe secret key to
 * anyone who asked, and was not ported for that reason.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ok = (detail) => ({ ok: true, ...detail });
const fail = (err) => ({ ok: false, error: err?.message || String(err) });

async function checkDynamo() {
  try {
    // A miss is a success: it proves we reached the table and were authorised.
    await getDynamo().send(
      new GetItemCommand({
        TableName: 'Shops',
        Key: { shop_id: { S: '__selftest__' } },
      })
    );
    return ok({ table: 'Shops', region: APP_AWS_REGION });
  } catch (err) {
    return fail(err);
  }
}

/**
 * Probe with HeadObject on a key that cannot exist, NOT HeadBucket.
 *
 * HeadBucket needs `s3:ListBucket`, which the IAM policy deliberately withholds
 * — nothing in the app lists buckets. So a HeadBucket probe would report 403
 * against a perfectly correct policy and send you chasing a non-problem.
 *
 * With object-level permissions the response distinguishes cleanly:
 *   404 NotFound  -> reachable and authorised (the object just isn't there)
 *   403 Forbidden -> the policy is actually wrong
 */
async function checkS3() {
  const results = {};

  for (const [name, bucket] of Object.entries(BUCKETS)) {
    try {
      await getS3().send(
        new HeadObjectCommand({ Bucket: bucket, Key: '__selftest_nonexistent__' })
      );
      results[name] = ok({ bucket, note: 'probe key unexpectedly exists' });
    } catch (err) {
      const status = err?.$metadata?.httpStatusCode;
      if (status === 404) {
        results[name] = ok({ bucket });
      } else {
        results[name] = { ...fail(err), bucket, httpStatusCode: status };
      }
    }
  }

  return results;
}

async function checkSupabase() {
  try {
    const { error } = await getSupabase().from('shops').select('shop_id').limit(1);
    if (error) return fail(error);
    return ok({});
  } catch (err) {
    return fail(err);
  }
}

function checkCognitoConfig() {
  // No API call: every Cognito flow this app uses except AdminUserGlobalSignOut
  // is unauthenticated, so what matters here is that the pool is configured.
  if (!COGNITO_USER_POOL_ID || !COGNITO_CLIENT_ID) {
    return fail(new Error('COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID not set'));
  }
  return ok({
    userPoolId: COGNITO_USER_POOL_ID,
    clientIdPrefix: `${COGNITO_CLIENT_ID.slice(0, 6)}…`,
  });
}

/**
 * The reason this endpoint exists.
 *
 * The old backend used STRIPE_SECRET_KEY_LIVE for subscriptions and a separate
 * STRIPE_SECRET_KEY for Connect. Nobody knows whether they're the same account,
 * and if the Connect key is a test key then merchant onboarding has been running
 * in test mode. Compare the two account IDs here before deciding whether to
 * collapse them into one variable.
 */
async function checkStripe(getClient, keyEnvName) {
  try {
    const key = process.env[keyEnvName] || '';
    const mode = key.startsWith('sk_live_')
      ? 'LIVE'
      : key.startsWith('sk_test_')
        ? 'TEST'
        : 'UNKNOWN';

    const account = await getClient().accounts.retrieve();
    return ok({ mode, accountId: account.id, country: account.country });
  } catch (err) {
    return fail(err);
  }
}

export async function GET(request) {
  const secret = process.env.APP_SELFTEST_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: 'APP_SELFTEST_SECRET is not configured; selftest disabled' },
      { status: 404 }
    );
  }
  if (request.headers.get('x-selftest-secret') !== secret) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [dynamo, s3, supabase, stripePlatform, stripeConnect] = await Promise.all([
    checkDynamo(),
    checkS3(),
    checkSupabase(),
    checkStripe(getStripe, 'STRIPE_SECRET_KEY_LIVE'),
    checkStripe(getConnectStripe, 'STRIPE_SECRET_KEY'),
  ]);

  const sameStripeAccount =
    stripePlatform.ok && stripeConnect.ok
      ? stripePlatform.accountId === stripeConnect.accountId
      : null;

  return NextResponse.json({
    region: APP_AWS_REGION,
    hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET_KEY_LIVE),
    dynamo,
    s3,
    supabase,
    cognito: checkCognitoConfig(),
    stripe: {
      platform: stripePlatform,
      connect: stripeConnect,
      // true  -> safe to collapse to a single STRIPE_SECRET_KEY_LIVE
      // false -> two accounts; keep both variables and find out why
      sameAccount: sameStripeAccount,
    },
  });
}
