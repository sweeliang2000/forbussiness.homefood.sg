import Link from 'next/link';
import LandingFooter from '@/components/LandingFooter/LandingFooter';
import LandingNavbar from '@/components/LandingNavbar/LandingNavbar';
import styles from './not-found.module.css';

const NotFound = () => {
  return (
    <>
      <LandingNavbar />
      <main className={styles.page}>
        <section className={styles.panel} aria-labelledby="not-found-title">
          <div className={styles.cloudLayer} aria-hidden="true" />
          <p className={styles.kicker}>Page not found</p>
          <div className={styles.code} aria-hidden="true">
            404
          </div>
          <div className={styles.copy}>
            <h1 id="not-found-title">Sorry, that page could not be found</h1>
            <p>
              The page may have moved, been removed, or the link may be incorrect.
            </p>
            <Link href="/" className={styles.homeLink}>
              Go Back Home
            </Link>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
};

export default NotFound;
