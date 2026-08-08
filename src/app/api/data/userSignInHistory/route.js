// HAND-WRITTEN, unlike its neighbours.
//
// scripts/generate-api-routes.mjs derives these files from the Express
// routes/home.js in ../../Collbine-Authentication, which has no equivalent
// route — this endpoint is new here. Add it to that file before the generator
// is next run, or this will be deleted.
import { withApi } from '@/lib/server/withApi';
import { getUserSignInHistory } from '@/lib/server/controllers/Authentication';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Deliberately not role-gated at the route: any member may read their *own*
// sign-in history, whatever their role. The controller resolves the caller
// from verified Cognito claims and only demands Owner or Manager when the
// target is someone else.
export const GET = withApi(getUserSignInHistory);
