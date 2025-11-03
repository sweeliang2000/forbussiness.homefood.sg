// hoc/withAuthorization.js
import apiClient from '@/utility/api';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { REFRESH_USER_COOKIE } from '@/utility/apiPaths';

// TODO: - Check if user has already logged in.
export default function withAuthorization(WrappedComponent) {
    return function AuthHOC(props) {
        const router = useRouter();

        useEffect(() => {
            const verifyAuth = async () => {
                try {
                    await apiClient.get(REFRESH_USER_COOKIE);
                    router.replace('/app');
                } catch (error) {
                    // Silently handle errors - missing userDataHTTP cookie is expected for unauthenticated users
                }
            };

            verifyAuth();
        }, [router]);


        return <WrappedComponent {...props} />;
    };
}
