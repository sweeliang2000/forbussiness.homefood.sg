import { withApi } from '@/lib/server/withApi';
import { createSuccessResponse } from '@/lib/server/errors';

/**
 * TEMPORARY — delete with the rest of the selftest routes.
 *
 * The smallest possible real exercise of withApi: it requires a session, so
 * hitting it with a browser's cookies proves the whole auth path — JWKS fetch,
 * token verification, refresh-on-expiry, cookie write-back, the operator gate —
 * before any controller has been ported.
 *
 * Verification matrix this is meant to satisfy:
 *   valid token          -> 200, session echoed
 *   expired + refresh    -> 200, plus Set-Cookie for accessToken/idToken/userData*
 *   no cookies           -> 401 AUTHENTICATION_ERROR
 *   Operator + GET       -> 200
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApi(async (req, res) => {
  res.status(200).json(
    createSuccessResponse('Authenticated', {
      session: req.session,
      role: req.role,
      // Proof the JWT itself verified, not just that a cookie was present.
      tokenSubject: req.user?.sub ?? null,
      tokenUse: req.user?.token_use ?? null,
    })
  );
});
