"use client";
import { BreadcrumsBar } from '@/components/breadcrumbsbar/breadcrumsbar';
import styles from './layout.module.css'
import Sidebar from "@/components/App/sidebar/sidebar";
import { AppFooter } from '@/components/AppFooter/AppFooter';
import MobileNavbar from '@/components/App/MobileNavbar/MobileNavbar';
import { useState } from 'react';

// export const metadata = {
//   title: "Collbine for Business | Customisable Loyalty Systems in Singapore",
//   description: "Collbine offers a loyalty system for Singapore merchants. Empower your business with a unique, flexible rewards program that allows customers to earn and redeem points, tailored to your shop’s needs.",
// };


export default function RootLayout({ children }) {
  const [isMenuOpen, setIsMenuOpened] = useState(false);

  return (
    <div className={styles.body}>
      <MobileNavbar 
        className={styles.mobileNavBar}
        isMenuOpen={isMenuOpen}
        toggleMenu={() => { setIsMenuOpened((preValue) => !preValue) }}
      />
      <Sidebar
        isClose={!isMenuOpen}
        onClose={() => { setIsMenuOpened(false) }}
        className={`${styles.sidebar} ${isMenuOpen && styles.open}`} />
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
