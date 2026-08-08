#!/usr/bin/env node
/**
 * One-shot codemod: Express controllers (CommonJS) -> src/lib/server/controllers (ESM).
 *
 * Run once during the migration, then delete along with the Express repo. It is
 * idempotent — it always reads from the Express source and overwrites the
 * destination, so re-running after a fix is safe.
 *
 *     node scripts/port-controllers.mjs
 *
 * Design note: this deliberately does NOT rewrite call sites. Each ported file
 * gets a header defining `client`, `s3`, `cognitoClient`, `sesClient`, `stripe`
 * and `supabase` as thin lazy proxies onto the shared getters in lib/server.
 * That keeps all ~300 `.send(...)` / `.from(...)` / `stripe.x.y(...)` calls
 * byte-identical to the originals, which is the whole point: the risk in a
 * 12,000-line port is in the edits you make, not the ones you don't.
 *
 * ---------------------------------------------------------------------------
 * SECURITY FIXES LIVE IN THE GENERATED FILES — DO NOT --force OVER THEM
 * ---------------------------------------------------------------------------
 *
 * Authentication.js has diverged deliberately. These four fixes exist only in
 * src/lib/server/controllers/Authentication.js, because they are edits to
 * handler bodies and the upstream Express source is not available here to write
 * a tested transform against:
 *
 *   globalSignOut        identity now from getAuthoritativeUser(req), not the
 *                        unsigned userDataHTTP cookie. Previously an
 *                        unauthenticated caller could sign out any account in
 *                        the pool by naming it in a forged Cookie header.
 *   updateUserRole       owner check via getAuthoritativeUser({ownerOnly:true})
 *   deleteUserFromShop   same, plus a recordActivity('user.remove')
 *   rejectInvitation     added the invitee check acceptInvitation already had
 *
 * The first three were cross-tenant: both the owner check and the same-shop
 * check read the same forged cookie, so one forged value passed both.
 *
 * The divergence guard below will refuse to overwrite these and list them. That
 * is working as intended — do not reach for --force to silence it. Port these
 * fixes upstream into the Express source first, or re-apply them by hand after,
 * and re-verify with the curl checks in the branch's PR description.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', '..', 'Collbine-Authentication');
const DST = join(HERE, '..', 'src', 'lib', 'server', 'controllers');

const BANNER = (source) => `/**
 * PORTED from the Express backend: ${source}
 *
 * Converted CommonJS -> ESM. Handler bodies are otherwise unchanged: they still
 * take (req, res) and still read req.cookies / req.body / req.files, which the
 * express-adapter shim supplies. Do not "modernise" them in place — the value of
 * this file is that it is diffable against the original.
 */
`;

/** Lazy proxies preserving the original local variable names. */
const AWS_SHIMS = {
  dynamo: (name) =>
    `const ${name} = { send: (command) => getDynamo().send(command) };`,
  s3: (name) => `const ${name} = { send: (command) => getS3().send(command) };`,
  ses: (name) => `const ${name} = { send: (command) => getSes().send(command) };`,
  cognito: (name) => `const ${name} = { send: (command) => getCognito().send(command) };`,
};

/**
 * The old config/supabase.js exported a client or null, so callers guard with
 * `if (!supabase) throw ...`. A proxy is always truthy, which turns those guards
 * into no-ops and lets getSupabase() raise its own, clearer error instead.
 */
const SUPABASE_SHIM = `const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getSupabase();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);`;

const stripeShim = (name, getter) => `const ${name} = new Proxy(
  {},
  {
    get(_target, prop) {
      return ${getter}()[prop];
    },
  }
);`;

// ---------------------------------------------------------------------------
// Per-file transformation specs
// ---------------------------------------------------------------------------

const FILES = [
  {
    src: 'commonFunctions.js',
    dst: 'commonFunctions.js',
    // Original line 2 built `new DynamoDBClient()` with NO region at all. That
    // worked on ECS via AWS_REGION plus the task role; on Vercel it would have
    // resolved Vercel's own Lambda credentials.
    dropRanges: [[1, 2]],
    header: `import {
  UpdateItemCommand,
  PutItemCommand,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';

import { getDynamo } from '../aws';

${AWS_SHIMS.dynamo('client')}
`,
  },
  {
    src: 'controllers/activityLog.js',
    dst: 'activityLog.js',
    dropRanges: [[1, 7]],
    // createExternalServiceError and createSuccessResponse are used by the
    // upstream handler bodies (the migration-needed branch and both success
    // responses) but were missing here, so every call threw a ReferenceError
    // and the activity log returned 500 unconditionally.
    header: `import {
  createDatabaseError,
  createValidationError,
  createExternalServiceError,
  createSuccessResponse,
  asyncHandler,
} from '../errors';
import { getSupabase } from '../supabase';

${SUPABASE_SHIM}
`,
  },
  {
    src: 'controllers/feed.js',
    dst: 'feed.js',
    dropRanges: [],
    header: '',
  },
  {
    src: 'controllers/mobileapp.js',
    dst: 'mobileapp.js',
    dropRanges: [[1, 5]],
    header: `import {
  GetItemCommand,
  UpdateItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

import { getDynamo } from '../aws';
import { getSupabase } from '../supabase';

${SUPABASE_SHIM}

${AWS_SHIMS.dynamo('client')}
`,
  },
  {
    src: 'controllers/orderingSettings.js',
    dst: 'orderingSettings.js',
    dropRanges: [[1, 15]],
    header: `import {
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  DeleteItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';

import {
  AppError,
  ERROR_TYPES,
  createSuccessResponse,
  createValidationError,
  createNotFoundError,
  createDatabaseError,
  createExternalServiceError,
  asyncHandler,
} from '../errors';
import { getDynamo } from '../aws';
import { getSupabase } from '../supabase';
import { recordActivity } from './activityLog';

${SUPABASE_SHIM}

${AWS_SHIMS.dynamo('client')}
`,
  },
  {
    src: 'controllers/paymentSettings.js',
    dst: 'paymentSettings.js',
    dropRanges: [[1, 14]],
    header: `import {
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';

import {
  AppError,
  ERROR_TYPES,
  createSuccessResponse,
  createValidationError,
  createDatabaseError,
  createExternalServiceError,
  asyncHandler,
} from '../errors';
import { getDynamo } from '../aws';
import { getSupabase } from '../supabase';
import { recordActivity } from './activityLog';

${SUPABASE_SHIM}

${AWS_SHIMS.dynamo('client')}
`,
  },
  {
    src: 'controllers/ratings.js',
    dst: 'ratings.js',
    dropRanges: [[1, 10]],
    header: `import {
  AppError,
  createSuccessResponse,
  createValidationError,
  createNotFoundError,
  createDatabaseError,
  asyncHandler,
} from '../errors';
import { getSupabase } from '../supabase';
import { recordActivity } from './activityLog';

${SUPABASE_SHIM}
`,
  },
  {
    src: 'controllers/shopOrders.js',
    dst: 'shopOrders.js',
    dropRanges: [[1, 10]],
    header: `import {
  AppError,
  createSuccessResponse,
  createValidationError,
  createNotFoundError,
  createDatabaseError,
  asyncHandler,
} from '../errors';
import { getSupabase } from '../supabase';
import { recordActivity } from './activityLog';

${SUPABASE_SHIM}
`,
  },
  {
    src: 'controllers/shopSlug.js',
    dst: 'shopSlug.js',
    dropRanges: [[1, 10]],
    header: `import {
  AppError,
  createSuccessResponse,
  createValidationError,
  createNotFoundError,
  createConflictError,
  createDatabaseError,
  createExternalServiceError,
  asyncHandler,
} from '../errors';
import { getSupabase } from '../supabase';
import { recordActivity } from './activityLog';

${SUPABASE_SHIM}
`,
  },
  {
    src: 'controllers/stripeConnect.js',
    dst: 'stripeConnect.js',
    dropRanges: [[1, 4]],
    header: `import { UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';

import { getDynamo } from '../aws';
import { getConnectStripe } from '../stripe';
import { FRONTEND_BASE_URL } from '../env';

${stripeShim('stripe', 'getConnectStripe')}

${AWS_SHIMS.dynamo('client')}
`,
  },
  {
    src: 'controllers/terminal.js',
    dst: 'terminal.js',
    dropRanges: [[1, 15]],
    header: `import { GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import crypto from 'node:crypto';

import {
  AppError,
  createSuccessResponse,
  createValidationError,
  createNotFoundError,
  createDatabaseError,
  createExternalServiceError,
  asyncHandler,
} from '../errors';
import { getDynamo } from '../aws';
import { getSupabase } from '../supabase';
import { recordActivity } from './activityLog';

${SUPABASE_SHIM}

${AWS_SHIMS.dynamo('dynamo')}
`,
  },
  {
    src: 'controllers/Authentication.js',
    dst: 'Authentication.js',
    // Dropped, highest line first so earlier ranges keep their numbering:
    //   7322-7461  checkReleaseStatus  -> lib/server/releaseStatus.js
    //    641-915   verifyToken, ROLES, getRoleFromRequest, authorizeRoles,
    //              requireOperatorLoyaltyTerminalOnly -> lib/server/session.js
    //      1-139   the require header, getCookieOptions, toUserId, and the
    //              node-jose JWKS verification replaced by lib/server/cognito.js
    dropRanges: [
      [1, 139],
      [641, 915],
      [7322, 7461],
    ],
    header: `import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  AdminUserGlobalSignOutCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  DeleteItemCommand,
  UpdateItemCommand,
  TransactWriteItemsCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

import { getS3, getDynamo, getSes, getCognito } from '../aws';
import { getAuthoritativeUser } from '../authoritative-user';
import { getSupabase } from '../supabase';
import { getStripe, getConnectStripe, getWebhookSecret } from '../stripe';
import {
  getCookieOptions,
  setAwaitingVerificationCookies,
} from '../cookies';
import {
  APP_AWS_REGION as REGION,
  COGNITO_CLIENT_ID as CLIENT_ID,
  COGNITO_USER_POOL_ID as USERPOOL_ID,
  SHOP_IMAGES_BUCKET,
  REWARD_IMAGES_BUCKET,
  MENU_BUCKET,
  LIVE_IMAGES_BUCKET,
  CLOUDFRONT_DOMAIN,
} from '../env';
import { s3PublicUrl, cloudfrontUrl } from '../s3-keys';
import { mapWithConcurrency } from '../concurrency';
import {
  AppError,
  ERROR_TYPES,
  createSuccessResponse,
  createValidationError,
  createAuthError,
  createAuthorizationError,
  createNotFoundError,
  createConflictError,
  createDatabaseError,
  createExternalServiceError,
  asyncHandler,
} from '../errors';
import { recordActivity } from './activityLog';
import * as stripeConnectController from './stripeConnect';
import {
  getStripeID,
  updateCustomerSubscriptionStatus,
  updateItem,
  putInvoiceItem,
  getPaymentFailedEmailSent,
  setPaymentFailedEmailSent,
  setShopUpgradePaymentStatus,
  getShopUpgradePaymentStatus,
} from './commonFunctions';

${SUPABASE_SHIM}

${stripeShim('stripe', 'getStripe')}

${AWS_SHIMS.dynamo('client')}

${AWS_SHIMS.s3('s3')}

${AWS_SHIMS.cognito('cognitoClient')}

/** The Users table is keyed on the lowercased email. */
const toUserId = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);
`,
  },
];

// ---------------------------------------------------------------------------
// Transformations applied to every file body
// ---------------------------------------------------------------------------

/**
 * `exports.foo = foo;` -> `export { foo };`
 *
 * Must run BEFORE convertNamedExports. Several files declare a function and then
 * re-export it by name (activityLog's recordActivity and actorFromReq,
 * terminal's computeEffectiveShopStatus); naively rewriting those to
 * `export const foo = foo` produces a duplicate declaration.
 */
function convertAliasExports(code) {
  return code.replace(/^exports\.([A-Za-z0-9_$]+)\s*=\s*\1\s*;[ \t]*$/gm, 'export { $1 };');
}

/** `exports.foo = ` -> `export const foo = ` */
function convertNamedExports(code) {
  return code.replace(/^exports\.([A-Za-z0-9_$]+)\s*=\s*/gm, 'export const $1 = ');
}

/**
 * `module.exports = { a, b };` -> `export { a, b };`
 * Allows leading whitespace: commonFunctions.js is indented throughout.
 */
function convertModuleExports(code) {
  return code.replace(/^[ \t]*module\.exports\s*=\s*\{/gm, 'export {');
}

/**
 * Two handlers re-required the Stripe SDK inline with the Connect key rather
 * than using the module-level client (Authentication.js:6916, 7105 in the
 * original). Point them at the shared lazy getter.
 */
function convertInlineStripeRequires(code) {
  return code.replace(
    /const stripeConnect = require\('stripe'\)\(process\.env\.STRIPE_SECRET_KEY\);/g,
    'const stripeConnect = getConnectStripe();'
  );
}

/**
 * The nine hand-built public S3 URLs that interpolated process.env.AWS_REGION —
 * a variable name Vercel will not let us set. See lib/server/env.js.
 */
function convertS3Urls(code) {
  const BUCKET_EXPR = {
    '${process.env.AWS_BUCKET_NAME}': 'SHOP_IMAGES_BUCKET',
    'collbine-forbusiness-shop-images': 'SHOP_IMAGES_BUCKET',
    'collbine-forbusiness-reward-images': 'REWARD_IMAGES_BUCKET',
    'collbine-forbusiness-menus': 'MENU_BUCKET',
  };

  return code.replace(
    /`https:\/\/(\$\{process\.env\.AWS_BUCKET_NAME\}|collbine-forbusiness-[a-z-]+)\.s3\.\$\{process\.env\.AWS_REGION\}\.amazonaws\.com\/\$\{([^`]+?)\}`/g,
    (match, bucket, key) => {
      const expr = BUCKET_EXPR[bucket];
      if (!expr) throw new Error(`Unmapped bucket in S3 URL: ${match}`);
      return `s3PublicUrl(${expr}, ${key})`;
    }
  );
}

/** Remaining bare bucket-name env reads. */
function convertBucketEnv(code) {
  return code
    .replace(/process\.env\.MENU_BUCKET_NAME/g, 'MENU_BUCKET')
    .replace(/process\.env\.AWS_BUCKET_NAME/g, 'SHOP_IMAGES_BUCKET');
}

/** Mid-file client constructions that aren't in the header block. */
function convertInlineClients(code) {
  return code
    .replace(
      /^const sesClient = new SESClient\(\{[^}]*\}\)\s*;?\s*$/gm,
      AWS_SHIMS.ses('sesClient')
    )
    // addStamps built its own Supabase client inline instead of using the shared
    // one (Authentication.js:7880-7883). The header's proxy covers it.
    .replace(
      /^\s*const supabaseUrl = process\.env\.SUPABASE_URL;[\s\S]*?const supabase = createClient\([^)]*\);\s*$/gm,
      '    // Uses the module-level shared Supabase client (see header).'
    );
}

/**
 * Make the sign-out cookie clears host-only.
 *
 * signOutUser and globalSignOut each build a `clearCookieOptions` from
 * COOKIE_DOMAIN, back when cookies were scoped to `.homefood.sg` to reach a
 * separate API host. Both the constant and that setup are gone — cookies are
 * host-only now — so the block has to be dropped, and each clear given an
 * explicit host-only option that matches how getCookieOptions sets them.
 *
 * Done here rather than hand-edited into the generated file, because
 * `npm run migrate:controllers` overwrites that file and would silently revert it.
 */
function normalizeSignOutCookieClears(code) {
  let rewritten = 0;

  let result = code.replace(
    / *const clearCookieOptions = process\.env\.NODE_ENV === 'production'\n *\? \{ path: '\/', domain: COOKIE_DOMAIN, secure: true, sameSite: 'None' \}\n *: \{ path: '\/' \};\n\n/g,
    ''
  );
  result = result.replace(/res\.clearCookie\(cookie, clearCookieOptions\);/g, () => {
    rewritten++;
    return "res.clearCookie(cookie, { path: '/' });";
  });

  if (rewritten !== 2) {
    throw new Error(
      `normalizeSignOutCookieClears: expected 2 rewrites (signOutUser, globalSignOut), found ${rewritten}. ` +
        'The upstream source changed — re-check before shipping, or sign-out will not clear the session.'
    );
  }

  if (/COOKIE_DOMAIN/.test(result)) {
    throw new Error('normalizeSignOutCookieClears: a reference to COOKIE_DOMAIN survived; it is no longer defined.');
  }

  return result;
}

/**
 * Strip multer.
 *
 * Authentication.js built a module-level `upload` (memoryStorage, 10 MB) and
 * composed `upload.single('rewardImage')` into the PostReward export array.
 * Route handlers parse multipart natively via request.formData(), so both go —
 * and withApi drops the array's leading element anyway, which would have left
 * `const upload = multer(...)` evaluating at import with multer gone.
 */
function removeMulter(code) {
  return code
    .replace(
      /^const upload = multer\(\{[\s\S]*?\n\}\);\n/m,
      '// multer removed: withApi({ body: \'form\' }) handles multipart via request.formData().\n'
    )
    .replace(/^\s*upload\.single\('[^']*'\),\n/gm, '');
}

/**
 * getSignedUrl needs a REAL S3Client, not the `.send`-only shim.
 *
 * The shim works for command dispatch because that's all `client.send(cmd)`
 * needs. But `getSignedUrl(client, command, opts)` reaches into the client's
 * resolved config and clones its middleware stack, so handing it `{ send }`
 * throws at runtime — and only on the five code paths that presign a URL, which
 * are exactly the ones a smoke test is least likely to cover.
 */
function fixPresignerClient(code) {
  return code.replace(/getSignedUrl\(s3,/g, 'getSignedUrl(getS3(),');
}

/** Hardcoded infrastructure literals -> env-backed constants. */
function convertHardcodedInfra(code) {
  return code
    .replace(/const cloudfrontDomain = '[^']*';/g, 'const cloudfrontDomain = CLOUDFRONT_DOMAIN;')
    .replace(/const targetBucket = 'collbine-shop-images-live';/g, 'const targetBucket = LIVE_IMAGES_BUCKET;')
    .replace(/Bucket: 'collbine-shop-images-live'/g, 'Bucket: LIVE_IMAGES_BUCKET');
}

/**
 * UploadImage returned a literal placeholder host (Authentication.js:2371), so
 * every URL it produced was broken. Fixed here rather than left as-is: carrying
 * a known-dead URL across the migration would make it look like the port caused it.
 */
function fixPlaceholderUrl(code) {
  return code.replace(
    /return `https:\/\/your-s3-bucket-name\.s3\.amazonaws\.com\/\$\{params\.Key\}`;/g,
    'return s3PublicUrl(SHOP_IMAGES_BUCKET, params.Key);'
  );
}

/**
 * Nominatim geocoding: 3 attempts at a 30s timeout with 2s/4s backoff is 96
 * seconds worst case, for a lookup that already returns null non-fatally. That
 * alone exceeds the function budget.
 */
function tightenGeocodeTimeouts(code) {
  return code
    .replace(/async function geocodePostalCode\(postalCode, retries = 3\)/, 'async function geocodePostalCode(postalCode, retries = 2)')
    .replace(/timeout: 30000\s*\n/, 'timeout: 3500\n')
    .replace(/Math\.pow\(2, attempt\) \* 1000/, 'attempt * 250');
}

function dropLineRanges(code, ranges) {
  if (!ranges.length) return code;
  const lines = code.split('\n');
  // Descending, so earlier ranges keep their original numbering.
  for (const [start, end] of [...ranges].sort((a, b) => b[0] - a[0])) {
    lines.splice(start - 1, end - start + 1);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------

mkdirSync(DST, { recursive: true });

const force = process.argv.includes('--force');
const diverged = [];

let totalIn = 0;
let totalOut = 0;

for (const spec of FILES) {
  const source = readFileSync(join(SRC, spec.src), 'utf8');
  totalIn += source.split('\n').length;

  let code = dropLineRanges(source, spec.dropRanges);
  code = convertAliasExports(code);
  code = convertNamedExports(code);
  code = convertModuleExports(code);
  code = convertInlineStripeRequires(code);
  code = convertS3Urls(code);
  code = convertBucketEnv(code);
  code = convertInlineClients(code);
  if (spec.dst === 'Authentication.js') code = normalizeSignOutCookieClears(code);
  code = removeMulter(code);
  code = convertHardcodedInfra(code);
  code = fixPresignerClient(code);
  code = fixPlaceholderUrl(code);
  code = tightenGeocodeTimeouts(code);

  const output = `${BANNER(spec.src)}\n${spec.header}\n${code.replace(/^\n+/, '')}`;
  const target = join(DST, spec.dst);

  // Divergence guard.
  //
  // This codemod is a one-shot migration tool, but it sits behind an npm script,
  // and once the port lands people start fixing bugs in the ported files. A blind
  // re-run then silently reverts those fixes — which is how a corrected presigner
  // client or a cookie-eviction call quietly disappears. Refuse instead, and let
  // a human diff.
  if (!force && existsSync(target) && readFileSync(target, 'utf8') !== output) {
    diverged.push(spec.dst);
    console.log(`  ${spec.src.padEnd(34)} -> SKIPPED (diverged from generator output)`);
    continue;
  }

  writeFileSync(target, output);
  totalOut += output.split('\n').length;

  console.log(`  ${spec.src.padEnd(34)} -> controllers/${spec.dst}`);
}

console.log(`\nPorted ${FILES.length - diverged.length} of ${FILES.length} files.`);

if (diverged.length) {
  console.log(
    `\n${diverged.length} file(s) have been edited since they were generated and were left alone:`
  );
  for (const name of diverged) console.log(`  src/lib/server/controllers/${name}`);
  console.log(
    '\nThose edits are probably fixes worth keeping. Diff before doing anything:\n' +
      '  git diff src/lib/server/controllers/\n' +
      'Fold anything worth preserving into this script, then re-run with --force.\n' +
      'Once the Express repo is deleted, delete this script and treat the ported\n' +
      'controllers as ordinary source.'
  );
}
