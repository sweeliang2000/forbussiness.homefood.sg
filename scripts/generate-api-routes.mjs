#!/usr/bin/env node
/**
 * Generates src/app/api/**\/route.js from the Express router.
 *
 *     node scripts/generate-api-routes.mjs          # write files
 *     node scripts/generate-api-routes.mjs --check  # print the manifest only
 *
 * routes/home.js is the single source of truth for 121 handler declarations
 * across 97 paths. Transcribing that by hand is where the mistakes come from —
 * a wrong method, a dropped route, a casing slip that works on macOS and 404s on
 * Vercel's Linux builder. So we parse it, and the manifest this produces doubles
 * as the fixture for the route-parity test.
 *
 * Delete along with the Express repo once the migration lands.
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROUTES_FILE = join(HERE, '..', '..', 'Collbine-Authentication', 'routes', 'home.js');
const API_DIR = join(HERE, '..', 'src', 'app', 'api');

/** Express router variable -> ported controller module. */
const CONTROLLER_MODULES = {
  Authentication: 'Authentication',
  feedController: 'feed',
  mobileAppController: 'mobileapp',
  stripeConnectController: 'stripeConnect',
  orderingSettingsController: 'orderingSettings',
  paymentSettingsController: 'paymentSettings',
  shopOrdersController: 'shopOrders',
  terminalController: 'terminal',
  shopSlugController: 'shopSlug',
  ratingsController: 'ratings',
  activityLogController: 'activityLog',
};

/**
 * Path rewrites. Both are forced on us by file-system routing.
 *
 * signUp -> signup
 *   Express matches case-insensitively, so /auth/signUp has always also answered
 *   /auth/signup — which is what apiPaths.js:1 actually requests. Next is
 *   case-sensitive on Linux, so the directory must match the caller.
 *
 * qrCode -> qrcode
 *   /data/qrCode and /data/qrcode/configuration are siblings under /data/. macOS
 *   is case-insensitive, so they cannot both exist as directories on a dev
 *   machine. Lowercase wins: it's the conventional URL, and it means changing 4
 *   frontend call sites instead of 8.
 */
const PATH_REWRITES = [
  [/^\/auth\/signUp$/, '/auth/signup'],
  [/^\/data\/qrCode(\/|$)/, '/data/qrcode$1'],
];

/**
 * Operators are read-only except on the loyalty terminal. The original matched
 * router-relative req.path against an allowlist, which would silently 403 every
 * Operator write once paths became absolute. Declared per route instead.
 */
const OPERATOR_WRITE_PATHS = new Set([
  '/mobile/terminalLogs',
  '/mobile/processStampTransaction',
]);

/**
 * Publish and Stripe-sync do real work: sequential S3 copies, a fully paginated
 * Stripe reconciliation. Everything else should finish in well under a second.
 */
const LONG_RUNNING_PATHS = new Set([
  '/data/publish/menu',
  '/data/publish/customer-facing-business-details',
]);

/** Not ported, with reasons. */
const EXCLUDED = new Map([
  [
    'POST /subscription/webhook',
    'declared twice; app.js:99 wins because it registers first, and only that ' +
      'one gets the raw body. Emitted separately below.',
  ],
]);

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

const source = readFileSync(ROUTES_FILE, 'utf8');

/** Line number of `router.use(Authentication.verifyToken)` — the auth boundary. */
const guardLine = source.split('\n').findIndex((l) => /router\.use\(Authentication\.verifyToken\)/.test(l)) + 1;
if (!guardLine) throw new Error('Could not find the verifyToken guard in routes/home.js');

/**
 * Extract the full argument list of a `router.method(...)` call.
 *
 * A regex can't do this: the middleware chains contain their own parentheses
 * and brackets, e.g.
 *
 *     router.post('/data/uploadIndividualStamp',
 *       upload.fields([{ name: 'stampedIcon', maxCount: 1 }, ...])
 *       ,Authentication.UploadImage)
 *
 * where a lazy `\)` match stops inside `upload.fields(...)` and reports the
 * handler as `upload.fields`. So scan with a depth counter, skipping over string
 * literals so an apostrophe or bracket inside a path can't unbalance it.
 */
function scanCall(text, openParenIndex) {
  let depth = 0;
  let quote = null;

  for (let i = openParenIndex; i < text.length; i++) {
    const ch = text[i];

    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) return { args: text.slice(openParenIndex + 1, i), end: i };
    }
  }

  throw new Error(`Unbalanced router call at offset ${openParenIndex}`);
}

const ROUTE_RE = /router\.(get|post|put|patch|delete)\(/g;

const routes = [];
let match;

while ((match = ROUTE_RE.exec(source)) !== null) {
  const method = match[1];
  const { args, end } = scanCall(source, match.index + match[0].length - 1);
  ROUTE_RE.lastIndex = end;

  const pathMatch = args.match(/^\s*'([^']+)'\s*,([\s\S]*)$/);
  if (!pathMatch) throw new Error(`Could not parse arguments for router.${method}(${args.slice(0, 60)}…)`);

  const [, rawPath, chain] = pathMatch;
  const line = source.slice(0, match.index).split('\n').length;

  const key = `${method.toUpperCase()} ${rawPath}`;
  if (EXCLUDED.has(key)) continue;

  // The final identifier in the middleware chain is the handler.
  const handlerMatch = [...chain.matchAll(/([A-Za-z0-9_$]+)\.([A-Za-z0-9_$]+)/g)].pop();
  if (!handlerMatch) throw new Error(`Could not find a handler for ${key}`);

  const [, controllerVar, exportName] = handlerMatch;
  const moduleName = CONTROLLER_MODULES[controllerVar];
  if (!moduleName) throw new Error(`Unknown controller "${controllerVar}" for ${key}`);

  let path = rawPath;
  for (const [pattern, replacement] of PATH_REWRITES) {
    path = path.replace(pattern, replacement);
  }

  routes.push({
    method: method.toUpperCase(),
    path,
    originalPath: rawPath,
    module: moduleName,
    export: exportName,
    auth: line > guardLine,
    roles: (chain.match(/authorizeRoles\(([^)]*)\)/)?.[1] ?? '')
      .split(',')
      .map((s) => s.trim().replace(/^'|'$/g, ''))
      .filter(Boolean),
    releaseStatus: /checkReleaseStatus/.test(chain),
    body: /upload\.(fields|single|any)/.test(chain) ? 'form' : 'json',
    operatorWrite: OPERATOR_WRITE_PATHS.has(rawPath),
    maxDuration: LONG_RUNNING_PATHS.has(rawPath) ? 300 : null,
  });
}

// PostReward is exported as [upload.single('rewardImage'), handler], so multer
// is composed into the export rather than declared on the route — routes/home.js
// shows no upload middleware for it. Without this it would be parsed as JSON and
// the reward image would silently vanish.
for (const route of routes) {
  if (route.module === 'Authentication' && route.export === 'PostReward') {
    route.body = 'form';
  }
}

// Mounted directly on the app, ahead of bodyParser.json(), so the handler
// receives an unparsed Buffer for signature verification.
routes.push({
  method: 'POST',
  path: '/subscription/webhook',
  originalPath: '/subscription/webhook',
  module: 'Authentication',
  export: 'handleStripeWebhook',
  auth: false,
  roles: [],
  releaseStatus: false,
  body: 'raw',
  operatorWrite: false,
  maxDuration: null,
});

// ---------------------------------------------------------------------------
// Group by path, emit one route.js per path
// ---------------------------------------------------------------------------

/** Express `:param` -> Next `[param]`. */
const toSegments = (path) =>
  path
    .split('/')
    .filter(Boolean)
    .map((s) => (s.startsWith(':') ? `[${s.slice(1)}]` : s));

const byPath = new Map();
for (const route of routes) {
  const dir = toSegments(route.path).join('/');
  if (!byPath.has(dir)) byPath.set(dir, []);
  byPath.get(dir).push(route);
}

function renderOptions(route) {
  const parts = [];
  if (!route.auth) parts.push('auth: false');
  if (route.roles.length) parts.push(`roles: [${route.roles.map((r) => `'${r}'`).join(', ')}]`);
  if (route.releaseStatus) parts.push('releaseStatus: true');
  if (route.operatorWrite) parts.push('operatorWrite: true');
  if (route.body !== 'json') parts.push(`body: '${route.body}'`);
  return parts.length ? `{ ${parts.join(', ')} }` : '';
}

function renderRouteFile(dir, group) {
  const modules = [...new Set(group.map((r) => r.module))].sort();

  const imports = modules
    .map((m) => {
      const names = [...new Set(group.filter((r) => r.module === m).map((r) => r.export))].sort();
      return `import { ${names.join(', ')} } from '@/lib/server/controllers/${m}';`;
    })
    .join('\n');

  const maxDuration = group.find((r) => r.maxDuration)?.maxDuration;

  const config = [
    "export const runtime = 'nodejs';",
    // Required. The adapter reads the Cookie header directly rather than via
    // next/headers, so Next's static analysis won't infer that these routes are
    // dynamic — and a GET it decides to prerender would serve one merchant's
    // data to everyone.
    "export const dynamic = 'force-dynamic';",
    maxDuration ? `export const maxDuration = ${maxDuration};` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const handlers = group
    .sort((a, b) => a.method.localeCompare(b.method))
    .map((r) => {
      const options = renderOptions(r);
      return `export const ${r.method} = withApi(${r.export}${options ? `, ${options}` : ''});`;
    })
    .join('\n');

  return `// GENERATED by scripts/generate-api-routes.mjs from the Express routes/home.js.
// Edit the generator, not this file — it is overwritten on every run.
import { withApi } from '@/lib/server/withApi';
${imports}

${config}

${handlers}
`;
}

const isCheck = process.argv.includes('--check');

if (isCheck) {
  for (const [dir, group] of [...byPath].sort()) {
    for (const r of group.sort((a, b) => a.method.localeCompare(b.method))) {
      const flags = [
        r.auth ? 'auth' : 'PUBLIC',
        r.roles.length ? `roles=${r.roles}` : null,
        r.releaseStatus ? 'release' : null,
        r.body !== 'json' ? `body=${r.body}` : null,
        r.operatorWrite ? 'operatorWrite' : null,
      ]
        .filter(Boolean)
        .join(' ');
      console.log(`${r.method.padEnd(6)} /api/${dir.padEnd(52)} ${r.module}.${r.export}  [${flags}]`);
    }
  }
  console.log(`\n${routes.length} routes across ${byPath.size} paths.`);
} else {
  // Wipe generated routes but keep the hand-written selftest ones.
  for (const entry of existsSync(API_DIR) ? readdirRecursive(API_DIR) : []) {
    if (!entry.includes('/selftest/') && entry.endsWith('route.js')) {
      const generated = readFileSync(entry, 'utf8').startsWith('// GENERATED');
      if (generated) rmSync(entry);
    }
  }

  for (const [dir, group] of byPath) {
    const target = join(API_DIR, dir);
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, 'route.js'), renderRouteFile(dir, group));
  }

  console.log(`Generated ${byPath.size} route files covering ${routes.length} handlers.`);
  for (const [key, reason] of EXCLUDED) {
    console.log(`  skipped ${key}: ${reason}`);
  }
}

function readdirRecursive(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...readdirRecursive(full));
    else out.push(full);
  }
  return out;
}
