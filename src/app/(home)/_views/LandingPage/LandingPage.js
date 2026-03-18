'use client';
import styles from './LandingPage.module.css';
import Abutton from '@/components/Buttons/Abutton';
import HeroSection from '../HeroSection/HeroSection';
import StatementSection from '../StatementSection/StatementSection';
import WhyUsSection from '../WhyUsSection/WhyUsSection';
import FeaturesSection from '../FeaturesSection/FeaturesSection';
import PricingSection from '../PricingSection/PricingSection';
import FAQSection from '../FAQSection/FAQSection';
import ContactSection from '../ContactSection/ContactSection';

const WHATSAPP_URL =
    'https://api.whatsapp.com/send/?phone=6588678978&text&type=phone_number&app_absent=0';

const LandingPage = () => {
    return (
        <div className={styles.landingPage}>
            <HeroSection />

            <StatementSection />

            <WhyUsSection />

            <FeaturesSection />

            <PricingSection />

            <FAQSection />

            <ContactSection />

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerContainer}>
                    <div className={styles.footerContent}>
                        <div className={styles.footerSection}>
                            <h4>Collbine for Business</h4>
                            <p>Scan-to-win loyalty that brings customers into your shop and boosts spend.</p>
                        </div>
                        <div className={styles.footerSection}>
                            <h4>Product</h4>
                            <ul>
                                <li><a href="#features">Features</a></li>
                                <li><a href="#pricing">Pricing</a></li>
                            </ul>
                        </div>
                        <div className={styles.footerSection}>
                            <h4>Support</h4>
                            <ul>
                                <li><a href="#contact">Contact Us</a></li>
                                <li>
                                    <a
                                        href={WHATSAPP_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Open WhatsApp support chat"
                                    >
                                        WhatsApp
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div className={styles.footerSection}>
                            <h4>Company</h4>
                            <ul>
                                <li><a href="#about">About Us</a></li>
                                <li><a href="/careers">Careers</a></li>
                                <li><a href="/privacy">Privacy Policy</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className={styles.footerBottom}>
                        <p>&copy; 2024 Collbine for Business. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
