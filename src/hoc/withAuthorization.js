// hoc/withAuthorization.js
import apiClient from '@/utility/api';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BE_API_AUTH_URL } from '../../config/config';

// TODO: - Check if user has already logged in.
export default function withAuthorization(WrappedComponent) {
    return function AuthHOC(props) {
        const router = useRouter();

        useEffect(() => {
            const verifyAuth = async () => {
                try {
                    await apiClient.post(`${BE_API_AUTH_URL}/verifytoken`);
                    router.replace('/app');
                } catch {
                    // Ignore Error
                }
            };

            verifyAuth();
        }, [router]);


        return <WrappedComponent {...props} />;
    };
}
