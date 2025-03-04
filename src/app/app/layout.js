import { BreadcrumsBar } from '@/components/breadcrumbsbar/breadcrumsbar';
import styles from './layout.module.css'
import { AppFooter } from '@/components/AppFooter/AppFooter';
import AppNav from './_views/AppNav/AppNav';

export const metadata = {
  title: 'Collbine for Business | Customisable Loyalty Systems in Singapore',
  description: 'Collbine offers a loyalty system for Singapore merchants. Empower your business with a unique, flexible rewards program that allows customers to earn and redeem points, tailored to your shop’s needs.',
};

export default function RootLayout({ children }) {
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
