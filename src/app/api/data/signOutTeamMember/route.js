// HAND-WRITTEN, unlike its neighbours.
//
// scripts/generate-api-routes.mjs derives these files from the Express
// routes/home.js in ../../Collbine-Authentication, which has no equivalent
// route — this endpoint is new here. Add it to that file before the generator
// is next run, or this will be deleted.
import { withApi } from '@/lib/server/withApi';
import { signOutTeamMember } from '@/lib/server/controllers/Authentication';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The controller re-derives the caller from verified claims and refuses any
// target outside their shop; `roles` here is defence in depth.
export const POST = withApi(signOutTeamMember, { roles: ['Owner', 'Manager'] });
