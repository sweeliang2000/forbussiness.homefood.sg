'use client';
import styles from './AppNav.module.css';
import MobileNavbar from '../../../../components/App/MobileNavbar/MobileNavbar';
import Sidebar from '@/components/App/sidebar/sidebar';
import { useState } from 'react';

const AppNav = ({ 
    subscriptionStatus, 
    isLoadingSubscription 
}) => {
    const [isMenuOpen, setIsMenuOpened] = useState(false);

    return (
        <>
            <MobileNavbar
                className={styles.mobileNavBar}
                isMenuOpen={isMenuOpen}
                toggleMenu={() => { setIsMenuOpened((preValue) => !preValue) }}
            />
            <Sidebar
                isClose={!isMenuOpen}
                onClose={() => { setIsMenuOpened(false) }}
                className={`${styles.sidebar} ${isMenuOpen && styles.open}`} 
                subscriptionStatus={subscriptionStatus}
                isLoadingSubscription={isLoadingSubscription}
            />
        </>
    )
};

export default AppNav;