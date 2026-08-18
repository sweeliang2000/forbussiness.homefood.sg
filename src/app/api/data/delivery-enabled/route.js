// Hand-written: this route has no Express ancestor. The generator knows its
// capability (ROUTE_CAPABILITIES) so a regeneration would reproduce it.
import { withApi } from '@/lib/server/withApi';
import { CAP } from '@/lib/permissions';
import { setDeliveryEnabled } from '@/lib/server/controllers/orderingSettings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PUT = withApi(setDeliveryEnabled, { capability: CAP.DELIVERY_TOGGLE });
