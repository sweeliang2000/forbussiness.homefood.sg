'use client';

import { useEffect, useState } from 'react';

import { can as canWithRole, deniedMessage } from '@/lib/permissions';
import { getUserDataFromCookie } from '@/utility/cookieUtils';

/**
 * The signed-in user's role, and what it lets them do.
 *
 * Same matrix the API enforces (src/lib/permissions.js), so a control is
 * disabled here exactly when the request behind it would 403. The server is
 * still the authority — this only spares people from discovering the rule by
 * being refused.
 *
 * The role is read in an effect rather than during render: `userDataNonHTTP`
 * only exists in the browser, so reading it while rendering would make the
 * server and client disagree and produce a hydration mismatch. Until it
 * resolves, `role` is null and `can()` answers false — controls start disabled
 * and enable a frame later, which is the safe direction to be wrong in, and is
 * invisible on the pages that are still fetching their data anyway.
 */
export default function usePermissions() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    setRole(getUserDataFromCookie()?.role ?? null);
  }, []);

  return {
    role,
    can: (capability) => canWithRole(role, capability),
    /** Tooltip text for a control this role cannot use. */
    reasonFor: deniedMessage,
  };
}
