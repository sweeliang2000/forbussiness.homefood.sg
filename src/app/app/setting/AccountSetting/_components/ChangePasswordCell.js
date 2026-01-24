'use client';
import { useEffect, useState } from 'react';
import { Skeleton } from '@mui/material';
import GeneralActionCell from '../_views/GeneralActionCell';
import { getUserDataFromCookie } from '@/utility/cookieUtils';
import cellStyles from '../_views/GeneralActionCell.module.css';

const ChangePasswordCell = () => {
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Get user data from cookies
        const userDataFromCookie = getUserDataFromCookie();
        setUserData(userDataFromCookie);
        setIsLoading(false);
    }, []);

    if (isLoading) {
        // Show a shimmer skeleton while account info is loading
        return (
            <div className={cellStyles.cell}>
                <div className={cellStyles.left}>
                    <Skeleton variant="text" width={220} height={24} />
                    <Skeleton variant="text" width={160} />
                </div>
                <div>
                    <Skeleton variant="rounded" width={160} height={36} />
                </div>
            </div>
        );
    }

    const email = userData?.email || userData?.user_id || 'Email not available';
    const role = userData?.role || 'Role not available';
    const shopId = userData?.shop_id || 'Shop ID not available';

    return (
        <GeneralActionCell
            title={email}
            description={`Role: ${role} • Shop ID: ${shopId}`}
            buttonTitle={'Change Password'}
            onClick={() => {
                window.open('https://billing.stripe.com/p/login/test', '_blank');
            }}
            type="primary"
        />
    );
}

export default ChangePasswordCell;  