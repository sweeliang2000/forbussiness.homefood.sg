'use client';
import { useEffect, useState } from 'react';
import GeneralActionCell from '../_views/GeneralActionCell';
import { getUserDataFromCookie } from '@/utility/cookieUtils';

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
        return (
            <GeneralActionCell
                title='Loading...'
                buttonTitle={'Change Password'}
                onClick={() => {}}
                type="primary"
                disabled={true}
            />
        );
    }

    return (
        <GeneralActionCell
            title={userData?.email || 'you@example.com'}
            description={userData?.role || 'unknown role'}
            buttonTitle={'Change Password'}
            onClick={() => {
                window.open('https://billing.stripe.com/p/login/test', '_blank');
            }}
            type="primary"
        />
    );
}

export default ChangePasswordCell; 