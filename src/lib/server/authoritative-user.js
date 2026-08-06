import 'server-only';

import { createAuthorizationError } from './errors';
import { lookupUser } from './user-provisioning';

/** Resolve tenancy from verified Cognito claims, never from the unsigned shop cookie. */
export async function getAuthoritativeUser(req, { ownerOnly = false } = {}) {
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

  if (!user?.shop_id) {
    throw createAuthorizationError('The verified identity is not linked to a shop');
  }
  if (ownerOnly && user.role !== 'Owner') {
    throw createAuthorizationError('Only the shop owner can manage billing');
  }

  // Repair the in-flight compatibility cookie so older downstream helpers
  // (for example audit logging) see the verified tenant and actor.
  req.cookies.userDataHTTP = JSON.stringify({
    user_id: user.user_id,
    role: user.role,
    shop_id: user.shop_id,
  });
  req.session = { userId: user.user_id, role: user.role, shopId: user.shop_id };
  return user;
}
