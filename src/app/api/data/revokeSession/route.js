// HAND-WRITTEN, unlike its neighbours.
//
// scripts/generate-api-routes.mjs derives these files from the Express
// routes/home.js in ../../Collbine-Authentication, which has no equivalent
// route — this endpoint is new here. Add it to that file before the generator
// is next run, or this will be deleted.
import { withApi } from '@/lib/server/withApi';
import { revokeUserSession } from '@/lib/server/controllers/Authentication';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Same reasoning as userSessions: signing out your own device needs no role.
// The controller re-checks that the session id actually belongs to the
// resolved member before revoking it.
export const POST = withApi(revokeUserSession);
