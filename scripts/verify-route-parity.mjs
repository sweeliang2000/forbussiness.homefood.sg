#!/usr/bin/env node
/**
 * Route-parity check: every Express route exists in src/app/api, and nothing
 * extra does.
 *
 *     node scripts/verify-route-parity.mjs
 *
 * The highest-value test in the migration. The failure modes it catches are all
 * silent ones — a route that 404s in production because a directory is
 * `signUp` on a case-insensitive Mac and `signup` on Vercel's Linux builder, a
 * method export forgotten on a multi-method file, a typo faithfully reproduced
 * on one side but not the other (`listOfInvitiedUsers` is real).
 *
 * It reads home.js for the expected set and walks the filesystem for the actual
 * set, so a hand-edit to a generated file shows up as a diff rather than being
 * quietly overwritten later.
 *
 * Exits non-zero on any mismatch. Wire into CI; delete with the Express repo.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROUTES_FILE = join(HERE, '..', '..', 'Collbine-Authentication', 'routes', 'home.js');
const API_DIR = join(HERE, '..', 'src', 'app', 'api');

/** Documented, intentional differences. Anything else is a failure. */
const RENAMES = [
  {
    from: 'POST /auth/signUp',
    to: 'POST /auth/signup',
    why: 'Express matches case-insensitively; apiPaths.js requests lowercase and Next is case-sensitive on Linux.',
  },
  ...['GET', 'POST', 'PUT', 'DELETE'].map((m) => ({
    from: `${m} /data/qrCode`,
    to: `${m} /data/qrcode`,
    why: '/data/qrCode and /data/qrcode/configuration cannot be sibling directories on a case-insensitive filesystem.',
  })),
  ...['GET', 'POST', 'PUT'].map((m) => ({
    from: `${m} /data/qrcode/configuration`,
    to: `${m} /data/qrcode/configuration`,
    why: 'unchanged; listed so the qrCode rewrite cannot accidentally capture it.',
  })),
];

/** Present in Express, deliberately absent here. */
const NOT_PORTED = new Map([
  [
    'POST /subscription/webhook (duplicate)',
    'routes/home.js:35 is shadowed by app.js:99 and never executes. One route file.',
  ],
  ['GET /health', 'ALB health check; no consumer once ECS is gone.'],
  ['GET /test-credentials', 'Unauthenticated; dumps AWS container-credential URIs.'],
  [
    'GET /api/subscription/webhook-config',
    'Unauthenticated; returns the first 20 characters of the live Stripe secret key.',
  ],
]);

/** Routes here but not in Express. */
const NEW_ROUTES = new Set([
  'GET /selftest',
  'GET /selftest/whoami',
]);

// --- expected: parse the Express router -------------------------------------

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
    else if ('(['.includes(ch) || ch === '{') depth++;
    else if (')]'.includes(ch) || ch === '}') {
      depth--;
      if (depth === 0) return { args: text.slice(openParenIndex + 1, i), end: i };
    }
  }
  throw new Error(`Unbalanced router call at ${openParenIndex}`);
}

function parseExpressRoutes() {
  const source = readFileSync(ROUTES_FILE, 'utf8');
  const re = /router\.(get|post|put|patch|delete)\(/g;
  const found = [];
  let m;

  while ((m = re.exec(source)) !== null) {
    const { args, end } = scanCall(source, m.index + m[0].length - 1);
    re.lastIndex = end;
    const path = args.match(/^\s*'([^']+)'/)?.[1];
    if (!path) throw new Error(`Could not read a path from router.${m[1]}(${args.slice(0, 40)}…)`);
    found.push(`${m[1].toUpperCase()} ${path}`);
  }

  // Independent sanity check on the parser itself: if the balanced scanner ever
  // silently skips a declaration, this catches it without trusting the scanner.
  const declared = (source.match(/^router\.(get|post|put|patch|delete)\(/gm) || []).length;
  if (found.length !== declared) {
    throw new Error(
      `Parser disagreement: scanned ${found.length} routes but ${declared} declarations start a line.`
    );
  }

  return found;
}

// --- actual: walk the emitted route files -----------------------------------

const METHOD_EXPORT = /^export const (GET|POST|PUT|PATCH|DELETE)\s*=/gm;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name === 'route.js') out.push(full);
  }
  return out;
}

function readEmittedRoutes() {
  if (!existsSync(API_DIR)) return [];

  const found = [];
  for (const file of walk(API_DIR)) {
    // [param] -> :param, so both sides speak the Express dialect.
    const path =
      '/' +
      relative(API_DIR, dirname(file))
        .split('/')
        .map((s) => (s.startsWith('[') ? `:${s.slice(1, -1)}` : s))
        .join('/');

    const source = readFileSync(file, 'utf8');
    for (const m of source.matchAll(METHOD_EXPORT)) {
      found.push(`${m[1]} ${path}`);
    }
  }
  return found;
}

// --- compare ----------------------------------------------------------------

const renameMap = new Map(RENAMES.map((r) => [r.from, r.to]));

const expected = new Set(
  parseExpressRoutes()
    // The duplicate webhook declaration collapses onto the app.js one.
    .filter((r, i, all) => all.indexOf(r) === i)
    .map((r) => renameMap.get(r) ?? r)
);

const actual = new Set(readEmittedRoutes());

const missing = [...expected].filter((r) => !actual.has(r)).sort();
const unexpected = [...actual].filter((r) => !expected.has(r) && !NEW_ROUTES.has(r)).sort();

console.log(`Express routes (deduped): ${expected.size}`);
console.log(`Emitted route handlers:   ${actual.size}  (${NEW_ROUTES.size} new, not from Express)`);

if (missing.length) {
  console.error(`\n✗ ${missing.length} Express route(s) have no handler:`);
  for (const r of missing) console.error(`    ${r}`);
}

if (unexpected.length) {
  console.error(`\n✗ ${unexpected.length} handler(s) match no Express route:`);
  for (const r of unexpected) console.error(`    ${r}`);
}

if (!missing.length && !unexpected.length) {
  console.log('\n✓ Route parity holds.');
  console.log('\nIntentional differences:');
  for (const r of RENAMES.filter((r) => r.from !== r.to)) {
    console.log(`  renamed  ${r.from}  ->  ${r.to}`);
    console.log(`           ${r.why}`);
  }
  for (const [route, why] of NOT_PORTED) {
    console.log(`  dropped  ${route}`);
    console.log(`           ${why}`);
  }
  process.exit(0);
}

process.exit(1);
