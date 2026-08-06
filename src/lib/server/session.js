import 'server-only';

import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

import { getCognito } from './aws';
import { verifyAccessToken, verifyIdToken, decodeToken } from './cognito';
import { getCookieOptions, COOKIE_NAMES } from './cookies';
import { COGNITO_CLIENT_ID } from './env';
import { ensureUserProvisioned } from './user-provisioning';
import {
  AppError,
  createAuthError,
  createAuthorizationError,
  createExternalServiceError,
} from './errors';

/**
 * Authentication, ported from Authentication.js:641-915 (`verifyToken`,
 * `getRoleFromRequest`, `authorizeRoles`).
 *
 * Lives in its own module rather than inside the ported controller so that
 * withApi — and therefore every one of the ~99 route files — doesn't
 * transitively pull in 8,000 lines of controller plus the Stripe SDK just to
 * check a cookie.
 *
 * Two layers, as in the original:
 *   1. Identity comes from a Cognito JWT in the `accessToken` cookie, verified
 *      against the pool's JWKS.
 *   2. Tenancy (shop_id) and role come from the `userDataHTTP` cookie, which is
 *      httpOnly and server-set but NOT signed. That's a pre-existing weakness:
 *      a non-browser client holding a valid accessToken could present an
 *      arbitrary userDataHTTP and act as another shop. Preserved deliberately —
 *      changing it means touching ~107 call sites and belongs in its own change.
 */

export const ROLES = { OWNER: 'Owner', MANAGER: 'Manager', OPERATOR: 'Operator' };

const ONE_HOUR_MS = 3600 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;

/** Write the user-data pair to both the response and the in-flight request. */
function setUserDataCookies(req, res, { user_id, role, shop_id }) {
  const userDataStr = JSON.stringify({ user_id, role, shop_id });

  res.cookie(
    COOKIE_NAMES.USER_DATA_HTTP,
    userDataStr,
    getCookieOptions({ httpOnly: true, maxAge: ONE_HOUR_MS })
  );
  res.cookie(
    COOKIE_NAMES.USER_DATA_NON_HTTP,
    userDataStr,
    getCookieOptions({ httpOnly: false, maxAge: ONE_HOUR_MS })
  );

  // Backfill the request too. The original did this only on the refresh path
  // (Authentication.js:796-798); on the "valid token but no userDataHTTP"
  // branch it set response cookies only, so that same request still died
  // downstream on `Missing userDataHTTP cookie`. Doing it in both places is a
  // deliberate fix.
  if (!req.cookies) req.cookies = {};
  req.cookies[COOKIE_NAMES.USER_DATA_HTTP] = userDataStr;
  req.cookies[COOKIE_NAMES.USER_DATA_NON_HTTP] = userDataStr;
}

/**
 * Express-style middleware: authenticate, refreshing tokens when possible.
 * Attaches the verified JWT payload to `req.user`.
 */
export async function verifyToken(req, res, next) {
  const accessToken = req.cookies[COOKIE_NAMES.ACCESS_TOKEN];
  const refreshToken = req.cookies[COOKIE_NAMES.REFRESH_TOKEN];

  try {
    if (accessToken) {
      try {
        const verifiedPayload = await verifyAccessToken(accessToken);
        req.user = verifiedPayload;
        if (req.cookies[COOKIE_NAMES.ID_TOKEN]) {
          try {
            req.identity = await verifyIdToken(req.cookies[COOKIE_NAMES.ID_TOKEN]);
          } catch {
            // The verified access token still authenticates the request. Routes
            // requiring an email identity will fail closed if no safe claim is
            // available rather than trusting the unsigned shop cookie.
          }
        }

        const rawUserData = req.cookies[COOKIE_NAMES.USER_DATA_HTTP];
        let cookieUserData = null;
        if (rawUserData) {
          try {
            cookieUserData = JSON.parse(rawUserData);
          } catch {
            // A malformed user-data cookie is treated like a missing one and
            // replaced from the authoritative Users table below.
          }
        }

        // Older sessions can contain a valid userDataHTTP cookie without the
        // shop_id added by newer login responses. Repair incomplete cookies on
        // the first authenticated request instead of forcing the user to log in
        // again. Prefer the cookie's user_id because the access-token username
        // can be Cognito's opaque identifier rather than the Users-table email.
        if (!cookieUserData?.user_id || !cookieUserData?.role || !cookieUserData?.shop_id) {
          try {
            const idPayload = req.cookies[COOKIE_NAMES.ID_TOKEN]
              ? decodeToken(req.cookies[COOKIE_NAMES.ID_TOKEN])
              : null;
            const userId =
              cookieUserData?.user_id ||
              idPayload?.email ||
              idPayload?.['cognito:username'] ||
              idPayload?.username ||
              verifiedPayload.email ||
              verifiedPayload.username ||
              verifiedPayload.sub;
            const user = await ensureUserProvisioned(userId);
            if (user) {
              setUserDataCookies(req, res, user);
            }
          } catch (userDataError) {
            // Non-fatal: the token is valid, so let the request proceed and let
            // the handler's own cookie check produce the error if it needs one.
            console.error('Error generating userDataHTTP cookie:', userDataError);
          }
        }

        return next();
      } catch (accessTokenError) {
        // Expired or invalid. Fall through to the refresh flow if we can.
        if (!refreshToken) {
          if (accessTokenError instanceof AppError) throw accessTokenError;
          if (accessTokenError.message === 'Token has expired') {
            throw createAuthError('Token has expired');
          }
          throw createAuthError('Token verification failed');
        }
      }
    }

    if (refreshToken) {
      try {
        const data = await getCognito().send(
          new InitiateAuthCommand({
            AuthFlow: 'REFRESH_TOKEN_AUTH',
            ClientId: COGNITO_CLIENT_ID,
            AuthParameters: { REFRESH_TOKEN: refreshToken },
          })
        );

        if (!data.AuthenticationResult) {
          throw createAuthError('Failed to refresh access token');
        }

        const {
          AccessToken,
          IdToken,
          RefreshToken: NewRefreshToken,
        } = data.AuthenticationResult;

        res.cookie(
          COOKIE_NAMES.ACCESS_TOKEN,
          AccessToken,
          // The original forced sameSite:'Strict' here in development while every
          // other cookie used 'Lax'. Dropped: a Strict cookie isn't sent on a
          // top-level navigation back from Stripe, so that inconsistency was a
          // latent bug rather than a policy.
          getCookieOptions({ httpOnly: true, maxAge: ONE_HOUR_MS })
        );

        if (IdToken) {
          res.cookie(
            COOKIE_NAMES.ID_TOKEN,
            IdToken,
            getCookieOptions({ httpOnly: true, maxAge: ONE_HOUR_MS })
          );
        }

        // Cognito rotates refresh tokens on some pool configurations; persist
        // the new one or the old cookie outlives its validity.
        if (NewRefreshToken) {
          res.cookie(
            COOKIE_NAMES.REFRESH_TOKEN,
            NewRefreshToken,
            getCookieOptions({ httpOnly: true, maxAge: SEVEN_DAYS_MS })
          );
        }

        const verifiedPayload = await verifyAccessToken(AccessToken);
        req.user = verifiedPayload;
        if (IdToken) {
          req.identity = await verifyIdToken(IdToken);
        }

        try {
          // Prefer the ID token's email: the Users table is keyed on it, and the
          // access token may carry only an opaque username.
          const idPayload = IdToken ? decodeToken(IdToken) : null;
          const userId =
            idPayload?.email ||
            idPayload?.['cognito:username'] ||
            idPayload?.username ||
            verifiedPayload.username ||
            verifiedPayload.sub ||
            verifiedPayload.email;

          const user = await ensureUserProvisioned(userId);
          if (user) {
            setUserDataCookies(req, res, user);
          } else {
            console.warn('Refresh: no Users row for the refreshed identity');
          }
        } catch (userDataError) {
          console.error('Error refreshing userDataHTTP cookie:', userDataError);
        }

        return next();
      } catch (err) {
        if (err instanceof AppError) throw err;
        console.warn('Cognito refresh failed:', err.name || err.code, err.message);
        throw createExternalServiceError(
          'AWS Cognito',
          'refresh access token',
          err,
          'verifyToken'
        );
      }
    }

    throw createAuthError('Access token and/or refresh token is required');
  } catch (err) {
    if (err instanceof AppError) throw err;

    if (err.message === 'Token has expired') {
      throw createAuthError('Token has expired');
    }
    if (err.message?.includes('Token verification failed')) {
      throw createAuthError('Token verification failed');
    }
    throw createAuthError('Token verification failed');
  }
}

/**
 * Role resolution. Prefers the userDataHTTP cookie and falls back to the JWT's
 * claims, matching Authentication.js:846-863.
 */
export function getRoleFromRequest(req) {
  let role = null;

  const userDataCookie = req.cookies?.[COOKIE_NAMES.USER_DATA_HTTP];
  if (userDataCookie) {
    try {
      role = JSON.parse(userDataCookie).role || null;
    } catch {
      // Malformed cookie: fall through to the token claims.
    }
  }

  if (!role && req.user) {
    role =
      req.user.role ||
      (Array.isArray(req.user['cognito:groups']) ? req.user['cognito:groups'][0] : null);
  }

  return role;
}

/** Throws unless the caller holds one of `allowedRoles`. */
export function assertRole(req, allowedRoles) {
  const role = getRoleFromRequest(req);

  if (!role) {
    throw createAuthorizationError('User role not found');
  }
  if (allowedRoles?.length > 0 && !allowedRoles.includes(role)) {
    throw createAuthorizationError('You are not authorized to access this resource');
  }

  req.role = role;
  return role;
}

/**
 * Operators may read anything but may only write to the loyalty terminal.
 *
 * The original matched `req.path` against a hardcoded allowlist
 * (Authentication.js:894-915). Those paths were router-relative
 * ('/mobile/terminalLogs'); in Next they're absolute ('/api/mobile/terminalLogs'),
 * so a literal port would have silently 403'd every Operator write. The rule is
 * per-route anyway, so routes declare `operatorWrite: true` instead — exactly two
 * do. The third entry in the original allowlist, '/data/refreshUserCookie', was
 * already dead: it's registered as a GET.
 */
export function assertOperatorMayWrite(req, operatorWriteAllowed) {
  const role = getRoleFromRequest(req);
  req.role = role;

  if (role !== ROLES.OPERATOR) return;
  if (req.method === 'GET') return;
  if (operatorWriteAllowed) return;

  throw createAuthorizationError(
    'Operators can only perform GET requests and POST to Loyalty Terminal (terminalLogs, processStampTransaction)'
  );
}
