'use client';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './AppNav.module.css';
import MobileNavbar from '@/components/App/MobileNavbar/MobileNavbar';
import Sidebar from '@/components/App/sidebar/sidebar';

const DRAWER_ID = 'app-sidebar';

const AppNav = ({
    subscriptionStatus,
    isLoadingSubscription
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();

    const closeMenu = useCallback(() => setIsMenuOpen(false), []);

    // Picking a destination is the end of the drawer's job — it shouldn't
    // survive the route it was opened to leave.
    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    // While the drawer owns the screen it's a modal task: the page behind it
    // holds still, and Escape is always a way out.
    useEffect(() => {
        if (!isMenuOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (event) => {
            if (event.key === 'Escape') setIsMenuOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [isMenuOpen]);

    return (
        <>
            <MobileNavbar
                className={styles.mobileNavBar}
                isMenuOpen={isMenuOpen}
                controls={DRAWER_ID}
                toggleMenu={() => setIsMenuOpen((wasOpen) => !wasOpen)}
            />
            <Sidebar
                id={DRAWER_ID}
                isOpen={isMenuOpen}
                onClose={closeMenu}
                className={styles.sidebar}
                subscriptionStatus={subscriptionStatus}
                isLoadingSubscription={isLoadingSubscription}
            />
        </>
    )
};

export default AppNav;
