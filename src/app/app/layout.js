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
import { FaWhatsapp } from 'react-icons/fa';

export default function RootLayout({ children }) {
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    // TODO: Replace with proper role fetching implementation:
    // 1. Create a new HOC for role management or implement role fetching here
    // 2. Add proper error handling and loading states
    // 3. Consider using Context/Redux for global role state management
    // 4. Implement role-based access control for different sections
    // Check if lookup_key exists in localStorage first
    const storedLookupKey = getSubscriptionLookupKey();
    if (storedLookupKey) {
      setSubscriptionStatus(storedLookupKey);
      setIsLoadingSubscription(false);
    }
    
    // Refresh user cookie
    const refreshUserCookie = async () => {
      try {
        await apiClient.get(REFRESH_USER_COOKIE);
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

  // The terminal is a focused, full-screen POS — no dashboard sidebar; its own
  // design with a support footer pinned to the bottom (sticky-footer layout).
  if (pathname === '/app/terminal') {
    return (
      <div className={styles.terminalShell}>
        <main className={styles.terminalMain}>{children}</main>
        <footer className={styles.terminalFooter}>
          <div className={styles.footerHelp}>
            <span className={styles.footerText}>Need help with your terminal?</span>
            <a
              href="https://api.whatsapp.com/send/?phone=6588678978&text&type=phone_number&app_absent=0"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerWhatsapp}
            >
              <FaWhatsapp /> WhatsApp Support
            </a>
            <a href="mailto:support@homefood.sg" className={styles.footerEmail}>support@homefood.sg</a>
          </div>
          <span className={styles.footerCopy}>© {new Date().getFullYear()} HomeFood</span>
        </footer>
      </div>
    );
  }

  return (
    <div className={styles.body}>
      <AppNav subscriptionStatus={subscriptionStatus} isLoadingSubscription={isLoadingSubscription}/>
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
