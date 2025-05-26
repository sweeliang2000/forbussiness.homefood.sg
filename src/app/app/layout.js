"use client"
import { BreadcrumsBar } from '@/components/breadcrumbsbar/breadcrumsbar';
import styles from './layout.module.css'
import { AppFooter } from '@/components/AppFooter/AppFooter';
import AppNav from './_views/AppNav/AppNav';
import { useEffect } from 'react';

// export const metadata = {
//   title: 'Collbine for Business | Customisable Loyalty Systems in Singapore',
//   description: 'Collbine offers a loyalty system for Singapore merchants. Empower your business with a unique, flexible rewards program that allows customers to earn and redeem points, tailored to your shop's needs.',
// };

export default function RootLayout({ children }) {
  
  useEffect(() => {
    // TODO: Temporary console.log to verify component mounting
    // TODO: Replace with proper role fetching implementation:
    // 1. Create a new HOC for role management or implement role fetching here
    // 2. Add proper error handling and loading states
    // 3. Consider using Context/Redux for global role state management
    // 4. Implement role-based access control for different sections
    console.log("CALLED INSIDE LAYOUT OF APP")
  }, [])

  return (
    <div className={styles.body}>
      <AppNav/>
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
