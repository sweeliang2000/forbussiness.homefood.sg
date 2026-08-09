import 'server-only';

import { IS_PRODUCTION } from './env';

/**
 * Cookie handling.
 *
 * Six cookies carry the whole session. Four are httpOnly; two are deliberately
 * readable by client JS because the frontend parses them (see cookieUtils.js and
 * the js-cookie reads of `authStatus`).
 */
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'accessToken',
  ID_TOKEN: 'idToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_DATA_HTTP: 'userDataHTTP',
  USER_DATA_NON_HTTP: 'userDataNonHTTP',
  AUTH_STATUS: 'authStatus',
  /**
   * Identifies this browser's row in the BusinessSessions registry.
   *
   * Cognito can neither list a user's sessions nor revoke one of them, so the
   * app keeps its own registry and this is the handle into it. verifyToken
   * rejects a request whose session row is missing or revoked, which is what
   * makes per-device sign-out possible at all.
   */
  SESSION_ID: 'sid',
};

export const ALL_COOKIE_NAMES = Object.values(COOKIE_NAMES);

/**
 * Express-shaped cookie options, matching the original getCookieOptions().
 * `maxAge` here is MILLISECONDS, as Express expects — translateCookieOptions
 * converts on the way out.
 */
export const getCookieOptions = (options = {}) => {
  const defaults = {
    secure: IS_PRODUCTION,
    sameSite: 'Lax',
    path: '/',
  };

  return { ...defaults, ...options };
};

/**
 * Express cookie options -> NextResponse.cookies.set options.
 *
 * The one that bites: Express `maxAge` is in MILLISECONDS, Next's is in SECONDS.
 * Passing 3600000 straight through yields a cookie that claims to live 41 days.
 * Passing 3600 to Express would have expired it in 3.6 seconds. Convert.
 */
export const translateCookieOptions = (options = {}) => {
  const { maxAge, sameSite, ...rest } = options;

  const translated = { ...rest };

  if (typeof maxAge === 'number') {
    translated.maxAge = Math.floor(maxAge / 1000);
  }

  if (typeof sameSite === 'string') {
    translated.sameSite = sameSite.toLowerCase();
  }

  return translated;
};

/**
 * Awaiting-verification cookie, set after signup and read by the frontend's
 * AuthGuard to route the user to /verify.
 *
 * Signature preserved from the original utilities/cookie_handle.js so the
 * ported controller calls it unchanged; `res` here is the adapter's fake
 * response, which records rather than writes.
 */
export const setAwaitingVerificationCookies = (res, email, userSub) => {
  res.cookie(
    COOKIE_NAMES.AUTH_STATUS,
    JSON.stringify({
      data: { email, result: userSub },
      status: 'awaiting_verification',
    }),
    getCookieOptions({
      maxAge: 60 * 60 * 1000,
      httpOnly: false, // the frontend reads this one
    })
  );
};
