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
                } catch (error) {
                    const errorData = error?.response?.data;
                    const message = errorData?.error?.message || errorData?.message || error?.message || 'Token verification failed';
                    const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
                    console.log(`Authorization verification failed: ${message} (Error code: ${code})`);
                }
            };

            verifyAuth();
        }, [router]);


        return <WrappedComponent {...props} />;
    };
}
