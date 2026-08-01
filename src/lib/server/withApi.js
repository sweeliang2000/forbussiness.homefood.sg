import 'server-only';

import { parseBody } from './bodyParser';
import {
  makeReq,
  makeRes,
  createResponseContext,
  toNextResponse,
  runMiddleware,
} from './express-adapter';
import { verifyToken, assertRole, assertOperatorMayWrite } from './session';
import { applyReleaseStatus } from './releaseStatus';
import { COOKIE_NAMES } from './cookies';
import { AppError, ERROR_TYPES, createErrorResponse } from './errors';
import { DEBUG_ERRORS } from './env';

/**
 * Wraps a ported Express controller as a Next route handler.
 *
 * This replaces four things Express gave us for free and Next does not:
 *
 *   - positional `router.use()` guards. Express applied verifyToken to
 *     everything declared after line 40 of routes/home.js; file-system routing
 *     has no ordering, so protection has to be declared per route. `auth`
 *     defaults to true so forgetting the option fails closed.
 *   - middleware that mutates `req` for the handler to read (`req.user`,
 *     `req.releaseStatus`, `req.shop_id`, ...).
 *   - `asyncHandler` + the terminal error middleware.
 *   - `res` itself.
 *
 * @param {Function|Array} handler  controller fn, or multer-style [mw, fn]
 * @param {object}  options
 * @param {boolean} options.auth           require a valid session (default true)
 * @param {string[]} options.roles         restrict to these roles
 * @param {boolean} options.operatorWrite  let an Operator write to this route
 * @param {boolean} options.releaseStatus  resolve release state onto req first
 * @param {'json'|'form'|'raw'|'none'} options.body
 */
export function withApi(handler, options = {}) {
  const {
    auth = true,
    roles = null,
    operatorWrite = false,
    releaseStatus = false,
    body = 'json',
  } = options;

  // PostReward is exported as [upload.single('rewardImage'), handler] — multer
  // composed into the export rather than the route. Unwrap to the real handler;
  // the `body: 'form'` option covers what the multer half was doing.
  const fn = Array.isArray(handler) ? handler[handler.length - 1] : handler;

  return async function routeHandler(request, context) {
    const ctx = createResponseContext();
    const res = makeRes(ctx);
    let req;

    try {
      const parsed = await parseBody(request, body);
      const params = (await context?.params) ?? {};
      req = makeReq(request, { params, ...parsed });

      if (auth) {
        await runMiddleware(verifyToken, req, res);
      }

      if (roles?.length) {
        assertRole(req, roles);
      }

      // Operator gate runs on every authenticated route, matching the original
      // router-level middleware.
      if (auth) {
        assertOperatorMayWrite(req, operatorWrite);
        attachSession(req);
      }

      if (releaseStatus) {
        await applyReleaseStatus(req);
      }

      await fn(req, res);

      if (!ctx.sent) {
        // A handler that returned without responding. Express would hang until
        // the client gave up; here it would burn the whole maxDuration and
        // return a platform 504. cancelScheduledRelease does exactly this on its
        // error path (Authentication.js:7314-7319).
        console.error(`Handler returned without sending a response: ${request.method} ${req.path}`);
        ctx.status = 500;
        ctx.body = createErrorResponse(
          new AppError('Internal Server Error', ERROR_TYPES.INTERNAL_SERVER_ERROR, 500)
        );
        ctx.sent = true;
      }

      return toNextResponse(ctx);
    } catch (err) {
      const error =
        err instanceof AppError
          ? err
          : new AppError(
              err?.message || 'Internal Server Error',
              ERROR_TYPES.INTERNAL_SERVER_ERROR,
              500
            );

      if (!(err instanceof AppError)) {
        console.error('🚨 Unhandled error:', {
          message: err?.message,
          stack: err?.stack,
          method: request.method,
          url: request.url,
        });
      }

      ctx.status = error.statusCode;
      ctx.body = createErrorResponse(error, DEBUG_ERRORS);

      // Cookies are applied even on the error path. If auth refreshed the tokens
      // and then the handler threw, dropping the Set-Cookie headers would leave
      // the browser holding the expired pair — the user gets logged out by an
      // unrelated 500.
      return toNextResponse(ctx);
    }
  };
}

/**
 * A typed view of the session for new code, so it doesn't have to JSON.parse a
 * cookie string. The ~107 existing `req.cookies.userDataHTTP` reads in the
 * ported controllers are left alone deliberately.
 */
function attachSession(req) {
  try {
    const raw = req.cookies[COOKIE_NAMES.USER_DATA_HTTP];
    if (!raw) return;
    const { user_id, role, shop_id } = JSON.parse(raw);
    req.session = { userId: user_id, role, shopId: shop_id };
  } catch {
    // Leave req.session null; handlers that need it check.
  }
}

/** Convenience for the 16 unauthenticated routes. */
export const withPublicApi = (handler, options = {}) =>
  withApi(handler, { ...options, auth: false });
