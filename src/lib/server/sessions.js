import 'server-only';

import { randomUUID } from 'node:crypto';
import {
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';

import { getDynamo } from './aws';
import { SESSIONS_TABLE } from './env';

/*
  Session registry.

  Cognito is still the identity provider, but it offers no way to enumerate a
  user's sessions or revoke one of them — AdminUserGlobalSignOut is all or
  nothing. So the app issues its own session id at login, stores a row per
  browser, and treats that row as the thing that makes a request valid.
  Revoking a device is then an UpdateItem, not a Cognito call.

  DynamoDB rather than Supabase deliberately: this is a point read on every
  authenticated request, and rows need to disappear on their own. Native TTL
  also means the IP addresses in here age out without a cleanup job — the
  audit log needed one, this doesn't.
*/

const USER_INDEX = 'user_id-index';

/** Matches the refresh cookie: past this, the browser can't renew anyway. */
const SESSION_TTL_MS = 7 * 24 * 3600 * 1000;

/**
 * How long a lookup is trusted before re-reading DynamoDB.
 *
 * Without this, every authenticated request pays a round trip. With it a busy
 * session reads about once a minute, and the cost of that is the only real
 * downside of the whole design: a revoked session keeps working for up to this
 * long. Sixty seconds is the trade — still far tighter than the hour an
 * access-token expiry would give you.
 */
const CACHE_TTL_MS = 60 * 1000;

/** Don't write on every miss; last-seen is a rough "recently active" signal. */
const HEARTBEAT_MS = 5 * 60 * 1000;

// On globalThis so Next's dev-mode hot reload doesn't hand out a fresh empty
// cache on every edit.
const cache = (globalThis.__homefoodSessions ??= new Map());

const S = (value) => ({ S: String(value) });
const epochSeconds = (ms) => Math.floor(ms / 1000);

function fromItem(item) {
  if (!item) return null;
  return {
    sessionId: item.session_id?.S ?? null,
    userId: item.user_id?.S ?? null,
    shopId: item.shop_id?.S ?? null,
    createdAt: item.created_at?.S ?? null,
    lastSeenAt: item.last_seen_at?.S ?? null,
    revokedAt: item.revoked_at?.S ?? null,
    expiresAt: Number(item.expires_at?.N ?? 0),
    ip: item.ip?.S ?? null,
    city: item.city?.S ?? null,
    region: item.region?.S ?? null,
    country: item.country?.S ?? null,
    userAgent: item.user_agent?.S ?? null,
  };
}

/** Live means: exists, not revoked, not past its TTL. */
export function isLive(session) {
  if (!session) return false;
  if (session.revokedAt) return false;
  return !session.expiresAt || session.expiresAt > epochSeconds(Date.now());
}

/**
 * Start a session for a freshly authenticated browser.
 *
 * @returns {string} the session id, to be set as the `sid` cookie
 */
export async function createSession({ userId, shopId, origin = {} }) {
  const sessionId = randomUUID();
  const now = new Date();
  const nowIso = now.toISOString();

  const item = {
    session_id: S(sessionId),
    user_id: S(userId),
    shop_id: S(shopId),
    created_at: S(nowIso),
    last_seen_at: S(nowIso),
    expires_at: { N: String(epochSeconds(now.getTime() + SESSION_TTL_MS)) },
  };

  // Optional context — DynamoDB rejects empty strings, so only set what exists.
  for (const [attr, value] of [
    ['ip', origin.ip],
    ['city', origin.city],
    ['region', origin.region],
    ['country', origin.country],
    ['user_agent', origin.userAgent],
  ]) {
    if (value) item[attr] = S(value);
  }

  await getDynamo().send(new PutItemCommand({ TableName: SESSIONS_TABLE, Item: item }));
  return sessionId;
}

/**
 * Read a session, via the cache.
 *
 * Returns null when the row is gone. Callers must treat null and "not live" as
 * the same thing — see isLive.
 */
export async function getSession(sessionId) {
  if (!sessionId) return null;

  const cached = cache.get(sessionId);
  if (cached && cached.checkedAt + CACHE_TTL_MS > Date.now()) {
    return cached.session;
  }

  const { Item } = await getDynamo().send(
    new GetItemCommand({
      TableName: SESSIONS_TABLE,
      Key: { session_id: S(sessionId) },
    })
  );

  const session = fromItem(Item);
  cache.set(sessionId, { session, checkedAt: Date.now() });

  // The cache is per-instance and short-lived, but a long-running dev server
  // shouldn't accumulate every session it has ever seen.
  if (cache.size > 5000) {
    for (const [key, value] of cache) {
      if (value.checkedAt + CACHE_TTL_MS <= Date.now()) cache.delete(key);
    }
  }

  return session;
}

/**
 * Record that a session is still in use, at most once per HEARTBEAT_MS.
 *
 * Never throws: a failed heartbeat must not fail the request it rode in on —
 * the worst case is a stale "last active" reading.
 */
export async function touchSession(session, origin = {}) {
  if (!session?.sessionId) return;

  const lastSeen = session.lastSeenAt ? Date.parse(session.lastSeenAt) : 0;
  if (Number.isFinite(lastSeen) && lastSeen + HEARTBEAT_MS > Date.now()) return;

  const nowIso = new Date().toISOString();
  const names = { '#last_seen_at': 'last_seen_at' };
  const values = { ':last_seen_at': S(nowIso) };
  const sets = ['#last_seen_at = :last_seen_at'];

  // Keep the location current — a laptop that moved should say where it is now.
  for (const [attr, value] of [
    ['ip', origin.ip],
    ['city', origin.city],
    ['region', origin.region],
    ['country', origin.country],
  ]) {
    if (!value) continue;
    names[`#${attr}`] = attr;
    values[`:${attr}`] = S(value);
    sets.push(`#${attr} = :${attr}`);
  }

  try {
    await getDynamo().send(
      new UpdateItemCommand({
        TableName: SESSIONS_TABLE,
        Key: { session_id: S(session.sessionId) },
        UpdateExpression: `SET ${sets.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        // Don't resurrect a row that TTL or a revoke removed between the read
        // and this write.
        ConditionExpression: 'attribute_exists(session_id)',
      })
    );
    cache.set(session.sessionId, {
      session: { ...session, lastSeenAt: nowIso },
      checkedAt: Date.now(),
    });
  } catch (error) {
    if (error?.name !== 'ConditionalCheckFailedException') {
      console.error('touchSession failed:', error?.message);
    }
  }
}

/** Every live session belonging to one user, newest activity first. */
export async function listSessionsForUser(userId) {
  if (!userId) return [];

  const { Items } = await getDynamo().send(
    new QueryCommand({
      TableName: SESSIONS_TABLE,
      IndexName: USER_INDEX,
      KeyConditionExpression: 'user_id = :user_id',
      ExpressionAttributeValues: { ':user_id': S(userId) },
    })
  );

  return (Items ?? [])
    .map(fromItem)
    .filter(isLive)
    .sort((a, b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)));
}

/**
 * Kill one session.
 *
 * Marks rather than deletes so a request already in flight sees a revoked row
 * instead of a missing one — the outcome is the same, but it's easier to
 * explain when something goes wrong. TTL removes it later.
 */
export async function revokeSession(sessionId) {
  if (!sessionId) return;
  try {
    await getDynamo().send(
      new UpdateItemCommand({
        TableName: SESSIONS_TABLE,
        Key: { session_id: S(sessionId) },
        UpdateExpression: 'SET revoked_at = :now',
        ExpressionAttributeValues: { ':now': S(new Date().toISOString()) },
        ConditionExpression: 'attribute_exists(session_id)',
      })
    );
  } catch (error) {
    if (error?.name !== 'ConditionalCheckFailedException') throw error;
  } finally {
    // Drop it locally too, or this instance keeps honouring it for up to a
    // minute — including the request that did the revoking.
    cache.delete(sessionId);
  }
}

/** Kill every session a user holds. Used by both global sign-out paths. */
export async function revokeAllSessionsForUser(userId) {
  const sessions = await listSessionsForUser(userId);
  await Promise.all(sessions.map((session) => revokeSession(session.sessionId)));
  return sessions.length;
}

/** Forget a cached lookup — for when the row is known to have changed. */
export function forgetSession(sessionId) {
  if (sessionId) cache.delete(sessionId);
}
