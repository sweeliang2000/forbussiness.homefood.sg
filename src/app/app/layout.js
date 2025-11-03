"use client"
import { BreadcrumsBar } from '@/components/breadcrumbsbar/breadcrumsbar';
import styles from './layout.module.css'
import { AppFooter } from '@/components/AppFooter/AppFooter';
import AppNav from './_views/AppNav/AppNav';
import { useEffect, useState } from 'react';
import { getShopSubscriptionStatus } from '@/utility/api';
import { getSubscriptionLookupKey, setSubscriptionLookupKey } from '@/utility/subscriptionStorage';
import apiClient from '@/utility/api';
import { REFRESH_USER_COOKIE } from '@/utility/apiPaths';
import { useRouter, usePathname } from 'next/navigation';

// export const metadata = {
//   title: 'Collbine for Business | Customisable Loyalty Systems in Singapore',
//   description: 'Collbine offers a loyalty system for Singapore merchants. Empower your business with a unique, flexible rewards program that allows customers to earn and redeem points, tailored to your shop's needs.',
// };

export default function RootLayout({ children }) {
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    // TODO: Temporary console.log to verify component mounting
    // TODO: Replace with proper role fetching implementation:
    // 1. Create a new HOC for role management or implement role fetching here
    // 2. Add proper error handling and loading states
    // 3. Consider using Context/Redux for global role state management
    // 4. Implement role-based access control for different sections
    console.log("[INITIAL SETUP] CALLED INSIDE LAYOUT OF APP")
    
    // Check if lookup_key exists in localStorage first
    const storedLookupKey = getSubscriptionLookupKey();
    if (storedLookupKey) {
      setSubscriptionStatus(storedLookupKey);
      setIsLoadingSubscription(false);
      console.log("[SUBSCRIPTION STATUS] Loaded from localStorage:", storedLookupKey);
    }
    
    // Refresh user cookie
    const refreshUserCookie = async () => {
      try {
        await apiClient.get(REFRESH_USER_COOKIE);
        console.log("[REFRESH USER COOKIE] Successfully refreshed");
      } catch (error) {
        // If user not found (404), redirect to login
        if (error?.response?.status === 404) {
          const currentPath = pathname + (typeof window !== 'undefined' ? window.location.search : '');
          const encodedPath = encodeURIComponent(currentPath);
          const message = encodeURIComponent('401 Unauthorized\n\nPlease relogin to again access');
          router.push(`/login?message=${message}&redirect=${encodedPath}`);
          return;
        }
        // Silently handle other errors - missing userDataHTTP cookie is expected for unauthenticated users
        console.log("[REFRESH USER COOKIE] Silent error (expected for unauthenticated users)");
      }
    };

    // Fetch shop subscription status
    const fetchSubscriptionStatus = async () => {
      try {
        setIsLoadingSubscription(true);
        const subscriptionData = await getShopSubscriptionStatus();
        const lookupKey = subscriptionData.lookup_key;
        
        // Store lookup_key in localStorage
        setSubscriptionLookupKey(lookupKey);
        
        setSubscriptionStatus(lookupKey);
        console.log("[SUBSCRIPTION STATUS] Loaded:", subscriptionData);
      } catch (error) {
        console.error("[SUBSCRIPTION STATUS] Error:", error);
        setSubscriptionStatus({ lookup_key: null });
      } finally {
        setIsLoadingSubscription(false);
      }
    };

    refreshUserCookie();
    fetchSubscriptionStatus();
  }, [router, pathname])

  return (
    <div className={styles.body}>
      <AppNav subscriptionStatus={subscriptionStatus} isLoadingSubscription={isLoadingSubscription}/>
      <div className={styles.overlay}></div>
      <div className={styles.mainContainer}>
        <BreadcrumsBar />
        <main className={styles.main}>
          {children}
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
