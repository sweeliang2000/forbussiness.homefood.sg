# Authentication & Authorization

How a request proves who it is, and how the app decides what it may do.

- [The two layers](#the-two-layers)
- [Cookies](#cookies)
- [Sign-in](#sign-in)
- [Every authenticated request](#every-authenticated-request)
- [Token verification](#token-verification)
- [Roles](#roles)
- [The trust problem, and `getAuthoritativeUser`](#the-trust-problem-and-getauthoritativeuser)
- [Writing a new route](#writing-a-new-route)
- [Sign-out](#sign-out)
- [Known gaps](#known-gaps)

---

## The two layers

Auth here is **two separate things**, and almost every subtlety in this document comes from the gap between them.

| | Answers | Source | Trustworthy? |
|---|---|---|---|
| **Identity** | *Who are you?* | Cognito JWT in the `accessToken` cookie, verified against the pool's JWKS | **Yes** — cryptographically signed |
| **Tenancy + role** | *Which shop, and what may you do?* | `userDataHTTP` cookie, JSON, server-set, `httpOnly` | **No** — not signed |

`session.js:29-33` says so in its own header:

> a non-browser client holding a valid accessToken could present an arbitrary userDataHTTP and act as another shop. Preserved deliberately — changing it means touching ~107 call sites and belongs in its own change.

`httpOnly` stops *browser JavaScript* from forging it. It does not stop `curl`. Anything destructive must therefore not read role or `shop_id` from that cookie — see [the trust problem](#the-trust-problem-and-getauthoritativeuser).

---

## Cookies

Six cookies carry the session (`src/lib/server/cookies.js`):

| Cookie | httpOnly | Lifetime | Holds |
|---|---|---|---|
| `accessToken` | yes | 1h | Cognito access JWT — **the** identity |
| `idToken` | yes | 1h | Cognito ID JWT — carries `email` |
| `refreshToken` | yes | 7d | Used to mint a new access token |
| `userDataHTTP` | yes | 1h | `{user_id, role, shop_id}` — unsigned |
| `userDataNonHTTP` | **no** | 1h | Same JSON, readable by client JS for UI |
| `authStatus` | **no** | 1h | Post-signup "awaiting verification" state |

One gotcha worth knowing about, documented at `cookies.js:41`:

> Express `maxAge` is in MILLISECONDS, Next's is in SECONDS. Passing 3600000 straight through yields a cookie that claims to live 41 days.

`translateCookieOptions()` does the conversion. Set cookies through the adapter's `res.cookie()`, never `NextResponse.cookies.set` directly, or you get that bug back.

---

## Sign-in

`POST /api/auth/signIn` → `signIn` in `Authentication.js`. Cognito's `USER_PASSWORD_AUTH` flow:

```js
const params = {
  AuthFlow: "USER_PASSWORD_AUTH",
  ClientId: CLIENT_ID,
  AuthParameters: { USERNAME: username, PASSWORD: password },
};
const data = await cognitoClient.send(new InitiateAuthCommand(params));
```

On success the handler sets all six cookies. The app never sees or stores the password — Cognito owns credentials entirely.

**First sign-in provisions the tenant.** `ensureUserProvisioned` (`user-provisioning.js:44`) creates the `Users` row and its `Shops` row in one transaction, so a half-provisioned account can't exist:

```js
await getDynamo().send(new TransactWriteItemsCommand({
  TransactItems: [
    { Put: { TableName: USERS_TABLE, Item: { user_id: {S: user.user_id}, shop_id: {S: user.shop_id}, role: {S: 'Owner'} },
             ConditionExpression: 'attribute_not_exists(user_id)' } },
    { Put: { TableName: SHOPS_TABLE, Item: { shop_id: {S: user.shop_id}, NumberOfUsers: {N:'1'}, SubscriptionStatus: {S:'NO'} },
             ConditionExpression: 'attribute_not_exists(shop_id)' } },
  ],
}));
```

Two notes that catch people out:

- **A brand-new user is always `Owner` of a brand-new shop.** You join someone else's shop only by accepting an invitation, which *moves* you — it rewrites your `Users.shop_id`. A user belongs to exactly one shop.
- **`user_id` is the lowercased, trimmed email** (`toUserId`). `lookupUser` retries with the raw string for rows created before that rule, so don't assume case-insensitivity elsewhere.

---

## Every authenticated request

`withApi` (`src/lib/server/withApi.js`) wraps all 100 route handlers. It replaces four things Express gave for free — positional `router.use()` guards, middleware that mutates `req`, `asyncHandler`, and `res` itself.

The order is load-bearing:

```js
if (auth) {
  await runMiddleware(verifyToken, req, res);   // 1. identity
}
if (roles?.length) {
  assertRole(req, roles);                       // 2. role allowlist
}
if (auth) {
  assertOperatorMayWrite(req, operatorWrite);   // 3. operator write gate
  attachSession(req);
}
if (releaseStatus) {
  await applyReleaseStatus(req);
}
await fn(req, res);                             // 4. your handler
```

`auth` **defaults to `true`**, so forgetting the option fails closed. Of 100 route files, 16 opt out with `auth: false` — sign-in, signup, password reset, the Stripe webhook, the public shop page, and the invitation endpoints.

> **`auth: false` means `req.identity` is never populated.** `verifyToken` is the only thing that sets it. Any handler on such a route that calls `getAuthoritativeUser` will throw — which is a *feature*, and is exactly how the `globalSignOut` fix works.

---

## Token verification

`cognito.js` verifies against the pool's JWKS using `jose`, cached in module scope:

```js
const getJwks = () =>
  (cache.jwks ??= createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`), {
    cacheMaxAge: 600_000, cooldownDuration: 30_000, timeoutDuration: 3_000,
  }));
```

The checks for an **access** token:

```js
const { payload } = await jwtVerify(token, getJwks(), { issuer: ISSUER, algorithms: ['RS256'] });
if (payload.token_use !== 'access')            throw new Error('Token verification failed: not an access token');
if (COGNITO_CLIENT_ID && payload.client_id !== COGNITO_CLIENT_ID)
                                                throw new Error('Token verification failed: client_id mismatch');
```

Cognito access tokens carry **no `aud` claim**, so `token_use` + `client_id` is the correct check — see the note at `cognito.js:16-23` about why the original `audience: decodedToken.aud` was circular and did nothing.

**Two error messages are load-bearing.** `session.js` branches on them: `'Token has expired'` triggers a refresh attempt; anything else is a hard 401. Don't reword them.

### Refresh

If the access token is expired and a `refreshToken` exists, `verifyToken` exchanges it (`REFRESH_TOKEN_AUTH`), re-verifies the new token, and re-sets the cookies. Cognito rotates refresh tokens on some pool configurations, so a returned `NewRefreshToken` is persisted — otherwise the old cookie outlives its validity.

### `decodeToken` — read this before you use it

```js
/**
 * Decode without verifying. Used only to read claims off an ID token that
 * Cognito just handed us over TLS, never as an authorization decision.
 */
```

It does **not** verify a signature. Never branch on authorization using its output.

---

## Roles

Three, defined once at `session.js:36`:

```js
export const ROLES = { OWNER: 'Owner', MANAGER: 'Manager', OPERATOR: 'Operator' };
```

Case-sensitive. `'Viewer'` appears as a display fallback in the users table but **is not a real role** — treat it as a bug wherever you see it.

Two enforcement mechanisms:

**`assertRole(req, allowedRoles)`** — declarative, via `withApi({ roles: [...] })`. Only **5 routes** use it, all `['Owner']`: the four Stripe Connect routes and `DELETE /api/data/liveShopDetails`.

**`assertOperatorMayWrite(req, operatorWrite)`** — runs on *every* authenticated route:

```js
if (role !== ROLES.OPERATOR) return;   // Managers and Owners unaffected
if (req.method === 'GET') return;      // Operators may read anything
if (operatorWriteAllowed) return;      // opt-in per route
throw createAuthorizationError('Operators can only perform GET requests and POST to Loyalty Terminal …');
```

Exactly **2 routes** opt in: `/api/mobile/terminalLogs` and `/api/mobile/processStampTransaction`.

### Effective capabilities

| | Owner | Manager | Operator |
|---|---|---|---|
| Read anything in the shop | ✅ | ✅ | ✅ |
| Loyalty terminal writes | ✅ | ✅ | ✅ |
| Any other write | ✅ | ✅ | ❌ |
| Invite / revoke an invite | ✅ | ✅ | ❌ |
| Change a role, remove a member | ✅ | ❌ | ❌ |
| Billing, Stripe Connect | ✅ | ❌ | ❌ |

Manager is close to Owner. The line is **money and membership**.

> **There is no client-side role gating.** `sidebar.js` links every page unconditionally. The server is the only gate; UI role checks are cosmetic.

---

## The trust problem, and `getAuthoritativeUser`

`getRoleFromRequest` reads `userDataHTTP` first, falling back to JWT claims. That's fine for *shaping UI* and for read paths. It is **not** fine for anything destructive, because the cookie is unsigned.

`src/lib/server/authoritative-user.js` is the hardened path. It resolves the account from **verified Cognito claims** and looks it up in DynamoDB:

```js
export async function getAuthoritativeUser(
  req,
  { ownerOnly = false, ownerMessage = 'Only the shop owner can manage billing' } = {}
) {
  const candidates = [
    req.identity?.email,
    req.identity?.['cognito:username'],
    req.user?.email,
    req.user?.username,
    req.user?.['cognito:username'],
  ].filter(Boolean);

  let user = null;
  for (const candidate of [...new Set(candidates)]) {
    user = await lookupUser(candidate);
    if (user) break;
  }

  if (!user?.shop_id)  throw createAuthorizationError('The verified identity is not linked to a shop');
  if (ownerOnly && user.role !== 'Owner') throw createAuthorizationError(ownerMessage);

  // Repair the in-flight compatibility cookie so downstream helpers
  // (audit logging, for example) see the verified tenant and actor.
  req.cookies.userDataHTTP = JSON.stringify({ user_id: user.user_id, role: user.role, shop_id: user.shop_id });
  req.session = { userId: user.user_id, role: user.role, shopId: user.shop_id };
  return user;
}
```

Two properties worth internalising:

1. **It fails closed.** No `req.identity` (because the route is `auth: false`, or the token is bad) means no candidates, no lookup, and a 403.
2. **It repairs `req.cookies.userDataHTTP` with verified values.** So anything downstream that still reads the cookie — including `recordActivity`'s `actorFromReq` — gets trustworthy data for the rest of that request.

### Where it is used

11 call sites: subscriptions (5), payment settings (3), and the three team/security handlers hardened in `5d5fa48` — `globalSignOut`, `updateUserRole`, `deleteUserFromShop`.

### What it looks like in a handler

```js
// Money or membership: resolve from the verified identity.
const userData = await getAuthoritativeUser(req, {
  ownerOnly: true,
  ownerMessage: 'Only shop owners can delete users from the shop',
});

// Now userData.shop_id is safe to use as the tenancy boundary.
if (userItem.shop_id.S !== userData.shop_id) {
  throw createValidationError('User is not part of this shop');
}
```

**The failure mode this prevents** — and which was live until `5d5fa48` — is worth stating plainly. When both the owner check *and* the tenancy check read the same unsigned cookie, one forged value satisfies both:

```jsonc
// Cookie: userDataHTTP={"role":"Owner","shop_id":"<someone else's shop>"}
// Old code:
if (userData.role?.toLowerCase() !== "owner") throw ...       // passes: forged
if (userItem.shop_id.S !== userData.shop_id)  throw ...       // passes: same forged value
```

That is cross-tenant, not an escalation within your own shop.

---

## Writing a new route

Routes under `src/app/api/**/route.js` are **generated** by `scripts/generate-api-routes.mjs` from a sibling Express repo and carry a "do not edit" banner. `auth`/`roles` come from the upstream middleware chain. New hand-written endpoints belong in their own namespace — `src/app/api/subscription/*` is the existing precedent.

Default — authenticated, any role:

```js
import { withApi } from '@/lib/server/withApi';
import { myHandler } from '@/lib/server/my-module';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(myHandler);
```

Owner-only:

```js
export const POST = withApi(myHandler, { roles: ['Owner'] });
```

Public (be deliberate — this is one of 16):

```js
export const POST = withApi(myHandler, { auth: false });
```

Then in the handler, pick your identity source by consequence:

| Doing | Use |
|---|---|
| Reading the caller's own shop data | `req.cookies.userDataHTTP` is acceptable |
| Money, membership, sign-out, anything destructive | `getAuthoritativeUser(req)` |
| Owner-only destructive | `getAuthoritativeUser(req, { ownerOnly: true, ownerMessage: '…' })` |

---

## Sign-out

Two kinds:

- **`signOutUser`** — clears this browser's cookies. The session survives elsewhere.
- **`globalSignOut`** — `AdminUserGlobalSignOutCommand`, invalidating every refresh token for the account across all devices. UI lives in Account Settings.

```js
const { user_id: userId } = await getAuthoritativeUser(req);
const command = new AdminUserGlobalSignOutCommand({ UserPoolId: USERPOOL_ID, Username: userId });
await cognitoClient.send(command);
```

IAM already grants exactly `cognito-idp:AdminUserGlobalSignOut` on the pool — nothing to add.

> **Global sign-out does not take effect immediately.** Access tokens are verified locally against JWKS with no revocation check, so an already-issued token keeps working until it expires — **up to one hour**. Global sign-out kills the *refresh* path, not the current token. See the gaps below.

---

## Known gaps

Documented so nobody rediscovers them the hard way.

**1. `userDataHTTP` is unsigned.** The root issue. `httpOnly` blocks browser JS, not `curl`. Mitigated case-by-case with `getAuthoritativeUser`; the general fix means touching ~107 call sites.

**2. Revocation has a one-hour blind spot.** No revocation check on verify. The fix is a `sessions_valid_from` timestamp on the `Users` row, compared against the token's **`auth_time`** — not `iat`, because a refresh mints a new `iat` but preserves `auth_time`, so only `auth_time` kills the whole session lineage.

**3. A password reset does not sign other sessions out.** Cognito's `ConfirmForgotPassword` doesn't revoke. Someone who resets *because* they were compromised stays compromised until tokens expire.

**4. `invitationStatus` is unauthenticated** and returns invitations for any `?email=`, which is tenant/email enumeration.

**5. `acceptInvitation` is `auth: false`** and identity-checks against the unsigned cookie. Lower severity — the check is self-referential and the destructive branches have their own guards — but it should move to `getAuthoritativeUser`. Note that helper rejects users with no `shop_id`, which an invitee legitimately may be, so this needs care.

**6. No login rate limiting or failed-login tracking** in app code. Only Cognito's own throttling.

**7. No login telemetry at all.** The `Users` row has exactly `user_id`, `shop_id`, `role`. Nothing records when or from where anyone signed in.

**8. `/api/auth/insert` is broken.** `export const insert = asyncHandler(async (email) => {…})` while `withApi` calls `fn(req, res)` — it receives the whole `req` as `email` and never responds.

---

## File map

| File | Role |
|---|---|
| `src/lib/server/withApi.js` | Wraps every route; runs the guards in order |
| `src/lib/server/session.js` | `verifyToken`, refresh, `ROLES`, `assertRole`, `assertOperatorMayWrite` |
| `src/lib/server/cognito.js` | JWKS verification of access and ID tokens |
| `src/lib/server/cookies.js` | Cookie names, options, ms→s translation |
| `src/lib/server/authoritative-user.js` | The hardened identity path |
| `src/lib/server/user-provisioning.js` | `lookupUser`, first-login provisioning |
| `src/lib/server/controllers/Authentication.js` | Sign-in/up, reset, invitations, team management (**generated**) |
| `src/hoc/withAuthorization.js` | Client-side redirect for already-authed users on auth pages |
