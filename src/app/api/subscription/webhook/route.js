import { withApi } from '@/lib/server/withApi';
import { handleStripeWebhook } from '@/lib/server/subscriptions/handlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(handleStripeWebhook, { auth: false, body: 'raw' });
