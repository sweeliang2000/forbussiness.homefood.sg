// hoc/withAuthorization.js
import apiClient from '@/utility/api';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { VERIFY_TOKEN } from '@/utility/apiPaths';

// TODO: - Check if user has already logged in.
export default function withAuthorization(WrappedComponent) {
    return function AuthHOC(props) {
        const router = useRouter();

        useEffect(() => {
            const verifyAuth = async () => {
                try {
                    await apiClient.post(`${VERIFY_TOKEN}`);
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
