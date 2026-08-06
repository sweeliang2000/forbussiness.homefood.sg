import { withApi } from '@/lib/server/withApi';
import { getSubscriptionStatus } from '@/lib/server/subscriptions/handlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApi(getSubscriptionStatus);
