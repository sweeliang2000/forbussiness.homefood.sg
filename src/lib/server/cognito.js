import 'server-only';

import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';

import { APP_AWS_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID } from './env';

/**
 * Cognito access-token verification.
 *
 * Replaces the original verifyAccessToken(), which did an uncached
 * `axios.get(JWKS_URL)` on EVERY authenticated request and then converted the
 * JWK to PEM via node-jose. On a long-lived server that was merely wasteful; in
 * a serverless function it's an extra network round trip on every single
 * invocation. `createRemoteJWKSet` caches in module scope, so a warm function
 * pays nothing and a cold start pays one fetch.
 *
 * This is also stricter than what it replaces. The original passed
 * `audience: decodedToken.aud` — reading the expected audience out of the very
 * token it was validating, which is circular, and moot anyway because Cognito
 * *access* tokens carry no `aud` claim at all, so jwt.verify skipped the check.
 * We verify `token_use` and `client_id` instead, which is what Cognito actually
 * documents for access tokens.
 */

const ISSUER = `https://cognito-idp.${APP_AWS_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;

const cache = (globalThis.__homefoodCognitoJwks ??= {});

const getJwks = () =>
  (cache.jwks ??= createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`), {
    cacheMaxAge: 600_000,
    cooldownDuration: 30_000,
    timeoutDuration: 3_000,
  }));

/**
 * @throws {Error} with message 'Token has expired' or 'Token verification failed: ...'
 *
 * Those two message shapes are load-bearing: the session layer branches on them
 * to decide whether to attempt a refresh-token exchange or give up with a 401.
 */
export async function verifyAccessToken(token) {
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: ISSUER,
      algorithms: ['RS256'],
    });

    if (payload.token_use !== 'access') {
      throw new Error('Token verification failed: not an access token');
    }

    if (COGNITO_CLIENT_ID && payload.client_id !== COGNITO_CLIENT_ID) {
      throw new Error('Token verification failed: client_id mismatch');
    }

    return payload;
  } catch (err) {
    // jose signals expiry with code ERR_JWT_EXPIRED; the caller distinguishes
    // expiry (refreshable) from a bad signature (not refreshable) by message.
    if (err?.code === 'ERR_JWT_EXPIRED' || err?.name === 'JWTExpired') {
      throw new Error('Token has expired');
    }
    if (err?.message?.startsWith('Token verification failed')) {
      throw err;
    }
    throw new Error(`Token verification failed: ${err.message}`);
  }
}

/** Verify an ID token before using its email claim for authorization. */
export async function verifyIdToken(token) {
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: ISSUER,
      audience: COGNITO_CLIENT_ID || undefined,
      algorithms: ['RS256'],
    });

    if (payload.token_use !== 'id') {
      throw new Error('Token verification failed: not an ID token');
    }
    return payload;
  } catch (err) {
    if (err?.code === 'ERR_JWT_EXPIRED' || err?.name === 'JWTExpired') {
      throw new Error('Token has expired');
    }
    if (err?.message?.startsWith('Token verification failed')) throw err;
    throw new Error(`Token verification failed: ${err.message}`);
  }
}

/**
 * Decode without verifying. Used only to read claims off an ID token that
 * Cognito just handed us over TLS, never as an authorization decision.
 */
export function decodeToken(token) {
  try {
    return decodeJwt(token);
  } catch {
    return null;
  }
}
