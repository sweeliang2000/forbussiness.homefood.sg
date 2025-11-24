// hoc/withAuthorization.js
import apiClient from '@/utility/api';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { REFRESH_USER_COOKIE } from '@/utility/apiPaths';
import Cookies from 'js-cookie';

// TODO: - Check if user has already logged in.
export default function withAuthorization(WrappedComponent) {
    return function AuthHOC(props) {
        const router = useRouter();
        const pathname = usePathname();

        useEffect(() => {
            const verifyAuth = async () => {
                // Don't redirect if we're on auth pages (login, signup, verify, forgot-password)
                const isAuthPage = pathname?.startsWith('/login') || 
                                   pathname?.startsWith('/signup') || 
                                   pathname?.startsWith('/verify') || 
                                   pathname?.startsWith('/forgot-password');
                
                if (isAuthPage) {
                    return;
                }

                // Check if user is awaiting verification - don't redirect in that case
                const authStatusCookie = Cookies.get('authStatus');
                if (authStatusCookie) {
                    try {
                        const authStatus = JSON.parse(authStatusCookie);
                        if (authStatus.status === 'awaiting_verification') {
                            // User is awaiting verification, don't redirect
                            return;
                        }
                    } catch (error) {
                        // Continue with auth check if cookie parsing fails
                    }
                }

                try {
                    await apiClient.get(REFRESH_USER_COOKIE);
                    router.replace('/app');
                } catch (error) {
                    // Silently handle errors - missing userDataHTTP cookie is expected for unauthenticated users
                }
            };

            verifyAuth();
        }, [router, pathname]);


        return <WrappedComponent {...props} />;
    };
}
