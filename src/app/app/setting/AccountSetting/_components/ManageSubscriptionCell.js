'use client';
import { useRouter } from 'next/navigation';
import GeneralActionCell from '../_views/GeneralActionCell';

const ManageSubscriptionCell = () => {
    const router = useRouter();

    return (
        <GeneralActionCell
            title='Manage Subscription'
            description='Upgrade, downgrade, or manage your subscription plan, payment methods, and billing history.'
            buttonTitle='Manage Subscription'
            onClick={() => router.push('/app/subscription/manage')}
            type="primary"
        />
    );
}

export default ManageSubscriptionCell;