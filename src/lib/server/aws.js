import 'server-only';

import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SESClient } from '@aws-sdk/client-ses';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

import { APP_AWS_REGION, awsCredentials } from './env';

/**
 * Lazily-constructed AWS SDK clients.
 *
 * Two rules, both load-bearing:
 *
 * 1. `region` and `credentials` are always passed explicitly. Never rely on the
 *    default provider chain — on Vercel it resolves Lambda's injected
 *    credentials for Vercel's own execution role. See env.js.
 *
 * 2. Construction is lazy. The old backend built these at module load, which is
 *    fine for a long-lived server but means a missing env var would break
 *    `next build` here, since ~90 route files import this transitively.
 *
 * Cached on globalThis rather than in module scope so Next's dev-mode hot reload
 * doesn't leak a new client (and a new connection pool) on every edit.
 */

const cache = (globalThis.__homefoodAws ??= {});

export const getS3 = () =>
  (cache.s3 ??= new S3Client({
    region: APP_AWS_REGION,
    credentials: awsCredentials(),
  }));

export const getDynamo = () =>
  (cache.dynamo ??= new DynamoDBClient({
    region: APP_AWS_REGION,
    credentials: awsCredentials(),
  }));

export const getSes = () =>
  (cache.ses ??= new SESClient({
    region: APP_AWS_REGION,
    credentials: awsCredentials(),
  }));

/**
 * Cognito.
 *
 * Note that most Cognito calls this app makes (SignUp, InitiateAuth,
 * ConfirmSignUp, ResendConfirmationCode, ForgotPassword, ConfirmForgotPassword)
 * are *unauthenticated* APIs addressed by app client ID — they don't consult
 * these credentials at all. Only AdminUserGlobalSignOut needs IAM, which is why
 * the IAM policy grants exactly that one action.
 */
export const getCognito = () =>
  (cache.cognito ??= new CognitoIdentityProviderClient({
    region: APP_AWS_REGION,
    credentials: awsCredentials(),
  }));
