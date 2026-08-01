import 'server-only';

import { NextResponse } from 'next/server';

import { translateCookieOptions } from './cookies';

/**
 * A minimal Express req/res shim, so ~12,000 lines of controller can move into
 * route handlers without being rewritten.
 *
 * This is viable because the surface the controllers actually touch is tiny.
 * Measured across all twelve files:
 *
 *   res.status 228   res.json 33   res.cookie 16   res.clearCookie 2   res.sendStatus 1
 *   req.cookies 107  req.body 89   req.releaseStatus 36  req.files 35   req.query 25
 *   req.file 13      req.params 11 req.shop_id 10  req.user 7  req.role 2  req.headers 1
 *
 * There is no res.send, no res.redirect, no res.render, no streaming, no
 * req.ip/req.get(). Five response methods and nineteen request properties — so
 * the shim is complete rather than best-effort, and that completeness is what
 * makes the port mechanical instead of a rewrite.
 */

/**
 * Parse a Cookie header into a plain object.
 *
 * Deliberately not using next/headers' cookies(): reading the raw header keeps
 * the object MUTABLE, which the auth layer depends on — after refreshing tokens
 * it writes the new userDataHTTP back onto req.cookies so the ~107 downstream
 * reads in the same request see it.
 */
function parseCookieHeader(header) {
  const cookies = {};
  if (!header) return cookies;

  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (!name) continue;
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }

  return cookies;
}

export function makeReq(request, { params = {}, body = null, files = null, file = null } = {}) {
  const url = new URL(request.url);

  const headers = {};
  for (const [key, value] of request.headers.entries()) {
    headers[key.toLowerCase()] = value;
  }

  return {
    method: request.method,
    // Absolute (/api/...), unlike Express where it was router-relative. The only
    // consumer of req.path was the operator gate, which withApi now expresses
    // declaratively instead — see the operatorWrite option.
    path: url.pathname,
    originalUrl: url.pathname + url.search,
    url: url.pathname + url.search,
    headers,
    cookies: parseCookieHeader(request.headers.get('cookie')),
    query: Object.fromEntries(url.searchParams),
    params,
    body,
    files,
    file,

    // Slots that middleware fills in and handlers read back out.
    user: null,
    role: null,
    session: null,
    releaseStatus: undefined,
    shop_id: undefined,
    rejected_at: undefined,
    sentdatetime: undefined,
    reason: undefined,
    accepted_at: undefined,
  };
}

/**
 * Records what the handler wanted to send instead of sending it, so withApi can
 * decide the final shape (and still attach refreshed auth cookies even when the
 * handler ends up throwing).
 */
export function makeRes(ctx) {
  const res = {
    status(code) {
      ctx.status = code;
      return res;
    },
    json(payload) {
      ctx.body = payload;
      ctx.sent = true;
      return res;
    },
    sendStatus(code) {
      ctx.status = code;
      ctx.body = null;
      ctx.sent = true;
      return res;
    },
    cookie(name, value, options = {}) {
      ctx.cookies.push({ op: 'set', name, value, options });
      return res;
    },
    clearCookie(name, options = {}) {
      ctx.cookies.push({ op: 'del', name, options });
      return res;
    },
  };

  return res;
}

export function createResponseContext() {
  return { status: 200, body: null, sent: false, cookies: [] };
}

/**
 * Serialize one cookie to a Set-Cookie header string.
 *
 * Done by handing it to a throwaway NextResponse rather than building the
 * string here, so value encoding, the Expires/Max-Age pairing and attribute
 * casing stay byte-identical to what this adapter emitted before.
 */
function serializeCookie(name, value, options) {
  const carrier = new NextResponse(null);
  carrier.cookies.set(name, value, options);
  const headers = carrier.headers.getSetCookie?.() ?? [carrier.headers.get('set-cookie')];
  return headers[0];
}

/**
 * Turn the recorded context into a real response.
 *
 * Cookies become raw Set-Cookie headers instead of going through
 * `response.cookies`, because that collection is a map keyed by cookie NAME:
 * writing the same name twice keeps only the last one, where Express appends a
 * header per call. That silently broke sign-out once — each cookie was deleted
 * host-only and then again for a parent domain, and only the second, matching
 * nothing the browser held, survived. Appending keeps `res.cookie` behaving the
 * way the controllers were written against.
 */
export function toNextResponse(ctx) {
  const response =
    ctx.body === null
      ? new NextResponse(null, { status: ctx.status })
      : NextResponse.json(ctx.body, { status: ctx.status });

  for (const entry of ctx.cookies) {
    const header =
      entry.op === 'del'
        ? serializeCookie(entry.name, '', {
            ...translateCookieOptions(entry.options),
            maxAge: 0,
          })
        : serializeCookie(entry.name, entry.value, translateCookieOptions(entry.options));

    if (header) response.headers.append('set-cookie', header);
  }

  return response;
}

/**
 * Run an Express-style middleware to completion.
 *
 * Resolves when it calls next() with no argument or returns without signalling;
 * rejects when it throws or calls next(err). This lets verifyToken and
 * checkReleaseStatus port across untouched, including their habit of mutating
 * `req` for downstream handlers to read.
 */
export function runMiddleware(middleware, req, res) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const next = (err) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve();
    };

    Promise.resolve(middleware(req, res, next)).then(
      () => {
        if (settled) return;
        settled = true;
        resolve();
      },
      (err) => {
        if (settled) return;
        settled = true;
        reject(err);
      }
    );
  });
}
