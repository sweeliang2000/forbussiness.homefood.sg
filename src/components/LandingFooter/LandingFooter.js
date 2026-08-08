import Link from 'next/link';
import styles from './LandingFooter.module.css';

const WHATSAPP_URL =
    'https://api.whatsapp.com/send/?phone=6588678978&text&type=phone_number&app_absent=0';

const LandingFooter = () => {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerGrid}>
                <div>
                    <h4>HomeFood for Business</h4>
                    <p>Home-based food, made easy to discover, order, and pick up.</p>
                </div>
                <div>
                    <h4>Product</h4>
                    <ul>
                        <li><Link href="/#offer">What we offer</Link></li>
                        <li><Link href="/#how">How it works</Link></li>
                        <li><Link href="/founding-sellers">Founding Seller programme</Link></li>
                        <li><Link href="/pricing">Pricing</Link></li>
                    </ul>
                </div>
                <div>
                    <h4>Support</h4>
                    <ul>
                        <li><Link href="/faq">FAQ</Link></li>
                        <li>
                            <a
                                href={WHATSAPP_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                WhatsApp us
                            </a>
                        </li>
                        <li><a href="#">Onboarding guide</a></li>
                        <li><Link href="/payment-types-and-fees">Payment Types &amp; Fees</Link></li>
                        <li><Link href="/refund-policy">Refund &amp; Payment Policy</Link></li>
                    </ul>
                </div>
                <div>
                    <h4>Company</h4>
                    <ul>
                        <li><Link href="/about">About</Link></li>
                        <li><Link href="/team">Team</Link></li>
                        <li><Link href="/careers">Careers</Link></li>
                        <li><Link href="/privacy">Privacy</Link></li>
                    </ul>
                </div>
            </div>
            <div className={styles.footerBottom}>
                <p>&copy; 2026 HomeFood for Business. Built with home kitchens, for home kitchens.</p>
            </div>
        </footer>
    );
};

export default LandingFooter;
