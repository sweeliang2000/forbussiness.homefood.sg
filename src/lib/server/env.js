import 'server-only';

/**
 * Server-side environment access.
 *
 * Why every AWS variable carries an APP_ prefix:
 *
 * Vercel functions execute on AWS Lambda, and the Lambda runtime injects
 * AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_SESSION_TOKEN
 * describing *Vercel's own* execution role. Reading those names would silently
 * authenticate us as Vercel against our own account and fail every DynamoDB
 * call with an AccessDenied that points nowhere useful. Vercel also refuses to
 * let you define variables with those names, so the prefix isn't optional.
 *
 * The same reasoning is why aws.js passes `credentials` explicitly to every SDK
 * client instead of letting the default provider chain resolve them.
 */

export const APP_AWS_REGION = process.env.APP_AWS_REGION || 'ap-southeast-1';

/**
 * Resolved lazily, not at module load: a missing key must fail the request that
 * needs AWS, not `next build`.
 */
export function awsCredentials() {
  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'APP_AWS_ACCESS_KEY_ID / APP_AWS_SECRET_ACCESS_KEY are not set. ' +
        'These are required now that the app no longer runs under an ECS task role.'
    );
  }

  return { accessKeyId, secretAccessKey };
}

// --- S3 buckets -------------------------------------------------------------
// Kept on their original "collbine" names deliberately: renaming a live bucket
// is a data migration, not a config change.

export const SHOP_IMAGES_BUCKET =
  process.env.APP_S3_SHOP_IMAGES_BUCKET || 'collbine-forbusiness-shop-images';

export const REWARD_IMAGES_BUCKET =
  process.env.APP_S3_REWARD_IMAGES_BUCKET || 'collbine-forbusiness-reward-images';

export const MENU_BUCKET =
  process.env.APP_S3_MENU_BUCKET || 'collbine-forbusiness-menus';

/** Publish target. Written to by CopyObject only — never read, never presigned. */
export const LIVE_IMAGES_BUCKET =
  process.env.APP_S3_LIVE_IMAGES_BUCKET || 'collbine-shop-images-live';

export const CLOUDFRONT_DOMAIN =
  process.env.APP_CLOUDFRONT_DOMAIN || 'd1qms1ms25las5.cloudfront.net';

// --- Cognito ----------------------------------------------------------------

export const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
export const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;

// --- Application config -----------------------------------------------------

export const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'sender@example.com';
export const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'https://business.homefood.sg';
export const CUSTOMER_BASE_URL = process.env.CUSTOMER_BASE_URL || 'https://homefood.sg';
export const USERS_TABLE = process.env.USERS_TABLE || 'Users';

/**
 * Test hook that redirects payment-failed mail away from real merchants.
 * Must be empty in production.
 */
export const PAYMENT_FAILED_EMAIL_OVERRIDE = process.env.PAYMENT_FAILED_EMAIL_OVERRIDE || '';

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Whether to include stack traces in API error responses.
 *
 * The original backend gated this on NODE_ENV === 'development', which is never
 * true on Vercel — Preview builds report as 'production' — so stacks were
 * unreachable anywhere you'd actually want them. APP_DEBUG_ERRORS restores that
 * ability for Preview without touching Production.
 */
export const DEBUG_ERRORS =
  process.env.APP_DEBUG_ERRORS === '1' || process.env.NODE_ENV === 'development';
