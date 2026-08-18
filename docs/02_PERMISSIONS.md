# Permissions

Who may do what, and where that is decided.

This is the *authorization* half. For how a request proves who it is — cookies, Cognito, the session registry — see [01_AUTH_AUTHZ.md](./01_AUTH_AUTHZ.md).

- [The matrix](#the-matrix)
- [Why capabilities and not roles](#why-capabilities-and-not-roles)
- [How it is enforced](#how-it-is-enforced)
- [The three Operator capabilities are all immediate](#the-three-operator-capabilities-are-all-immediate)
- [Capability reference](#capability-reference)
- [Adding a route](#adding-a-route)
- [Adding a control to a page](#adding-a-control-to-a-page)
- [Known gaps](#known-gaps)

---

## The matrix

Three roles, defined once in `src/lib/permissions.js`. Owner keeps everything; the line between Manager and Owner is **money and membership**; the line between Manager and Operator is **content versus operations**.

| | Owner | Manager | Operator |
|---|:--:|:--:|:--:|
| Read every page in the shop | ✅ | ✅ | ✅ |
| Official Business Details — edit + publish | ✅ | ✅ | ⛔ |
| Customer-Facing Details — edit + publish | ✅ | ✅ | ⛔ |
| Send for release review | ✅ | ✅ | ⛔ |
| Menu content — categories, option groups, items, publish | ✅ | ✅ | ⛔ |
| **Menu availability — sold-out toggles** | ✅ | ✅ | ✅ |
| Ordering hours + order settings | ✅ | ✅ | ⛔ |
| **Delivery on/off** | ✅ | ✅ | ✅ |
| **Ordering calendar overrides** | ✅ | ✅ | ✅ |
| **Order queue — status, ETA, undo, confirm payment, delay-all** | ✅ | ✅ | ✅ |
| **Terminal — walk-in orders, shop open/close, stamps** | ✅ | ✅ | ✅ |
| Payment setup | ✅ | ✅ | ⛔ |
| Stripe Connect, subscription billing | ✅ | ⛔ | ⛔ |
| Invite a user as Manager or Operator | ✅ | ✅ | ⛔ |
| **Invite a user as Owner** | ✅ | ⛔ | ⛔ |
| Change a user's role, remove a user | ✅ | ⛔ | ⛔ |
| Loyalty config — rewards, QR, card design, stamp management | ✅ | ✅ | ⛔ |

Bold rows are what an Operator can actually *do*. Everything else they can only look at.

`'Viewer'` appears as a display fallback in the users table but **is not a real role** — treat it as a bug wherever you see it.

---

## Why capabilities and not roles

The obvious design is `roles: ['Owner', 'Manager']` on each route, and the codebase started there. It does not survive contact with two of the rules above.

**"Operator may flip delivery on/off but not change ordering hours."** Both travel in one `PUT /api/data/orderingSettings` — one payload, one route. No per-route role list can split them.

**"Operator may mark an item sold out but not edit the menu."** `POST /api/menu` sends the *entire* menu as one FormData.

Each was solved by giving the operational half its own narrow endpoint — `PUT /api/data/delivery-enabled` and the terminal's `PUT /api/data/menu/sold-out` — and then naming the permission rather than the role. A capability is a thing the product does; roles map onto it, not the other way round. When the rule changes, `CAPABILITY_ROLES` changes and nothing else does.

The predecessor was a single boolean, `operatorWrite`, which could only say "Operator or not". It is gone.

---

## How it is enforced

**One matrix, two enforcers.** `src/lib/permissions.js` is deliberately **not** `server-only`, so the API and the console read the same rules. Two copies would drift, and the drift is invisible until an Operator clicks an enabled button and gets a 403.

### Server

`assertCapability(req, capability)` in `session.js` runs on every authenticated route, via `withApi`:

```js
if (req.method === 'GET') return;                      // every role reads everything
if (rolesFor(capability).includes(role)) return;
throw createAuthorizationError(deniedMessage(capability));
```

**It fails closed.** A write route that declares no capability requires Owner or Manager, so forgetting the annotation locks Operators out rather than letting them through.

The 403 message is generated from the capability — "Only an Owner or Manager can change the ordering settings." The console surfaces `err.response.data.message` directly, so this is what the merchant reads.

`assertRole(req, roles)` still exists for the handful of routes pinned with `withApi({ roles: ['Owner'] })`: the four Stripe Connect routes and `DELETE /api/data/liveShopDetails`.

### Client

`usePermissions()` returns `{ role, can }` from the `userDataNonHTTP` cookie. A control is disabled exactly when the request behind it would 403.

The role is read in an effect, not during render — `userDataNonHTTP` exists only in the browser, and reading it while rendering would make server and client disagree. Until it resolves, `role` is `null` and `can()` answers false: controls start disabled and enable a frame later. That is the safe direction to be wrong in.

**The client is not a gate.** Sidebar links and page routes are open to every role by design — an Operator sees the settings they cannot change, greyed out, rather than an empty page. The server is the only thing standing between a role and an action.

---

## The three Operator capabilities are all immediate

Not a coincidence, and worth understanding before adding a fourth.

Most of this console is **draft-then-publish**: a save writes a draft, and a separate publish pushes it to the storefront. An Operator has no publish. So a draft-only permission would be a permission to change nothing.

Every capability an Operator holds therefore writes through to customers on the spot:

| Capability | Endpoint | Reaches customers |
|---|---|---|
| `MENU_AVAILABILITY` | `PUT /api/data/menu/sold-out` | Patches the draft **and** the live Supabase menu |
| `DELIVERY_TOGGLE` | `PUT /api/data/delivery-enabled` | Writes Supabase first, then the draft |
| `CALENDAR_OVERRIDE_EDIT` | `PUT·DELETE /api/data/calendarOverride` | Mirrored to Supabase on write |
| `SHOP_OPEN_TOGGLE` | `PUT /api/data/shop-open` | Supabase only — there is no draft |
| `ORDERS_MANAGE` | `PUT·POST /api/data/shop-orders/*` | Order state, never a draft |

Two consequences that catch people out:

**The delivery switch is live for every role, not just Operators.** One switch that behaves differently depending on who is looking at it would be worse than the inconsistency it fixes. Delivery *pricing and zones* stay on the draft-then-publish path — they are content; on/off is a switch.

**`delivery-enabled` deliberately does not set `isChanges`.** That flag drives the "unpublished changes" banner. The toggle has already published itself; flagging it would ask the merchant to publish something customers can already see. It writes Supabase first and the draft second, so a failure can never leave a draft claiming delivery is off while customers can still order it.

---

## Capability reference

`CAP.*` in `src/lib/permissions.js`.

| Capability | Roles | Covers |
|---|---|---|
| `BUSINESS_DETAILS_EDIT` | Owner, Manager | `official-business-information`, `publish/official-business-details` |
| `CUSTOMER_DETAILS_EDIT` | Owner, Manager | `customerDetails`, `publish/customer-facing-business-details` |
| `RELEASE_SUBMIT` | Owner, Manager | `sendForReview`, `cancelRelease` |
| `MENU_EDIT` | Owner, Manager | `POST /api/menu`, `publish/menu` |
| `MENU_AVAILABILITY` | all three | `menu/sold-out` |
| `ORDERING_SETTINGS_EDIT` | Owner, Manager | `orderingSettings`, `publish/shop-settings` |
| `DELIVERY_TOGGLE` | all three | `delivery-enabled` |
| `CALENDAR_OVERRIDE_EDIT` | all three | `calendarOverride` |
| `ORDERS_MANAGE` | all three | `shop-orders/*`, `walk-in-order` |
| `SHOP_OPEN_TOGGLE` | all three | `shop-open` |
| `LOYALTY_TERMINAL` | all three | `mobile/terminalLogs`, `mobile/processStampTransaction` |
| `LOYALTY_CONFIG` | Owner, Manager | rewards, QR codes, card design, stamp management |
| `PAYMENTS_EDIT` | Owner, Manager | `paymentSettings`, `publish/payment-settings` |
| `USERS_INVITE` | Owner, Manager | `InviteUser`, `sendInvitedUserAgain`, `invitedUser` |
| `USERS_MANAGE` | Owner | `userRole`, `userFromShop` |
| `BILLING` | Owner | subscription handlers (they also check `ownerOnly` themselves) |

**Inviting an Owner is not one of these.** `USERS_INVITE` gets a Manager as far as sending an invitation; the *role being granted* is checked separately inside `InviteUsers`, against the verified Cognito identity rather than the unsigned cookie — see below.

---

## Adding a route

```js
import { withApi } from '@/lib/server/withApi';
import { CAP } from '@/lib/permissions';

export const PUT = withApi(myHandler, { capability: CAP.ORDERS_MANAGE });
```

Omit `capability` and the write requires Owner or Manager. That default is correct for most new endpoints; declare one when the answer differs, **or** when you want the 403 to name what was refused instead of saying "perform this action".

Route files under `src/app/api/**/route.js` carry a "GENERATED — edit the generator" banner. The generator's input is a sibling Express repo that no longer exists locally, so hand-editing is what actually happens — but capabilities are also listed in `ROUTE_CAPABILITIES` in `scripts/generate-api-routes.mjs`, so a regeneration cannot silently strip authorization off a route. **If you add a capability to a route, add it there too.**

Then pick your identity source inside the handler by consequence:

| Doing | Use |
|---|---|
| Reading the caller's own shop data | `req.cookies.userDataHTTP` is acceptable |
| Money, membership, sign-out, anything destructive | `getAuthoritativeUser(req)` |
| Owner-only destructive | `getAuthoritativeUser(req, { ownerOnly: true, ownerMessage: '…' })` |

The capability check reads the **unsigned** cookie. That is fine for deciding which buttons work. It is not fine for privilege escalation, which is why `InviteUsers` re-checks with `getAuthoritativeUser` before granting Owner, and why `updateUserRole` and `deleteUserFromShop` do the same.

---

## Adding a control to a page

Most settings pages save through `HeaderSection`, so one prop covers the page:

```jsx
<HeaderSection title="Payments Setup" capability={CAP.PAYMENTS_EDIT} … />
```

For anything else — publish buttons, an invite button, a toggle:

```jsx
const { can } = usePermissions();

<PermissionGate allowed={can(CAP.MENU_EDIT)} capability={CAP.MENU_EDIT}>
  <Button onClick={save}>Save Menu</Button>
</PermissionGate>
```

`PermissionGate` renders the child untouched when allowed; otherwise it clones it with `disabled` and wraps it in a tooltip carrying `deniedMessage(capability)`. The `<span>` inside is load-bearing — a disabled MUI control fires no pointer events, so a tooltip attached straight to it never opens, and the user gets a dead button with no explanation.

**Only use it for permission refusals.** A control disabled for some other reason — unsaved edits, a shop under review, a pending request — needs its own message. Borrowing the permission tooltip tells the user something false. The sold-out switch in `MenuBuilder.js` shows both: `PermissionGate` for the capability, a plain `title` for "Save your menu changes first".

---

## Known gaps

**1. Role comes from an unsigned cookie.** `getRoleFromRequest` reads `userDataHTTP`, which is `httpOnly` and server-set but not signed — see [01_AUTH_AUTHZ.md](./01_AUTH_AUTHZ.md#the-trust-problem-and-getauthoritativeuser). A non-browser client holding a valid access token can present any role, so every capability check is only as strong as that cookie. Sensitive handlers already re-check with `getAuthoritativeUser`; routing *every* write capability check through it would close this properly, at one DynamoDB read per write.

**2. The matrix is verified, the behaviour is not.** The role × capability table is checked exhaustively and the build is clean, but no end-to-end run has been done against real Operator and Manager accounts. Nobody has watched an Operator's sold-out call return 200 and their ordering-hours save return 403 in a live session.

**3. `LOYALTY_CONFIG` was assumed.** Rewards, QR codes, card design and stamp management were never specified for Operators; they kept their previous Owner/Manager behaviour rather than a considered decision.
