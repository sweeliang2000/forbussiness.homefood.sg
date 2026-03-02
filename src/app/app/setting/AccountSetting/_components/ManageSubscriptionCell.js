'use client';
import { useState } from 'react';
import GeneralActionCell from '../_views/GeneralActionCell';
import apiClient from '@/utility/api';
import { CREATE_PORTAL_SESSION } from '@/utility/apiPaths';

const ManageSubscriptionCell = () => {
    const [isLoading, setIsLoading] = useState(false);

    const handleManageSubscription = async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const response = await apiClient.post(CREATE_PORTAL_SESSION);
            const portalUrl = response.data.data.url;
            window.location.href = portalUrl;
        } catch (error) {
            console.error('Failed to create portal session:', error);
            setIsLoading(false);
        }
    };

    return (
        <GeneralActionCell
            title='Manage Subscription'
            description='Access the Stripe billing portal to manage your subscription, update payment methods, and view billing history.'
            buttonTitle='Manage Subscription'
            onClick={handleManageSubscription}
            loading={isLoading}
            type="primary"
        />
    );
}

export default ManageSubscriptionCell;