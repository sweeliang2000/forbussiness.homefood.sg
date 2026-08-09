import 'server-only';

/**
 * Where a request came from — used to label a session with a place and a device.
 *
 * Vercel resolves the geo headers at its edge, so there's no IP database and no
 * third-party lookup involved. They're absent in local dev and on any other
 * host, which is why every field is optional and callers have to cope with a
 * session that only has a timestamp.
 *
 * Its own module rather than living beside the audit log: verifyToken runs on
 * every authenticated route, and session.js deliberately avoids importing
 * controllers so that ~99 route files don't transitively pull in Supabase.
 */
export function requestOrigin(req) {
  const headers = req?.headers ?? {};
  const forwarded = headers['x-forwarded-for'];

  return {
    // Left-most entry is the client; the rest are proxies.
    ip: (forwarded ? String(forwarded).split(',')[0] : headers['x-real-ip'])?.trim() || null,
    city: headers['x-vercel-ip-city'] ? decodeURIComponent(headers['x-vercel-ip-city']) : null,
    region: headers['x-vercel-ip-country-region'] || null,
    country: headers['x-vercel-ip-country'] || null,
    userAgent: headers['user-agent'] ? String(headers['user-agent']).slice(0, 400) : null,
  };
}
