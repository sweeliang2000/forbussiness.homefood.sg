import Link from 'next/link';
import styles from './AppFooter.module.css';

export const AppFooter = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className={styles.footer}>
            <Link href='/app'>Dashboard</Link>

            <div className={styles.bottom}>
                <ul>
                    <li className={styles.leftBorder}>Copyright © { currentYear }. All rights reserved.</li>
                    <li className={styles.leftBorder}><Link href='/'>Terms of Service</Link></li>
                    <li className={styles.leftBorder}><Link href='/'>Privacy Policy</Link></li>
                    <li><Link href='/'>Contact Us</Link></li>
                </ul>
            </div>
        </footer>
    )
};