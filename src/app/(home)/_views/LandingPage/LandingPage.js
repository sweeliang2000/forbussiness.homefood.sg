'use client';
import styles from './LandingPage.module.css';
import HeroSection from '../HeroSection/HeroSection';
import StatementSection from '../StatementSection/StatementSection';
import OfferSection from '../OfferSection/OfferSection';
import HowItWorksSection from '../HowItWorksSection/HowItWorksSection';
import PaymentsSection from '../PaymentsSection/PaymentsSection';
import PricingSection from '../PricingSection/PricingSection';
import WhyUsSection from '../WhyUsSection/WhyUsSection';
import FAQSection from '../FAQSection/FAQSection';
import Link from 'next/link';
import { FaLightbulb } from 'react-icons/fa';

const LandingPage = () => {
    return (
        <div className={styles.landingPage}>
            <HeroSection />

            <StatementSection />

            <OfferSection />

            <HowItWorksSection />

            <PaymentsSection />

            <PricingSection />

            <WhyUsSection />

            {/* CTA Bubble */}
            <div className={styles.ctaWrap}>
                <div className={styles.ctaBubble}>
                    <div className={styles.ctaRow}>
                        <div className={styles.ctaBulb}>
                            <FaLightbulb />
                        </div>
                        <div className={styles.ctaText}>
                            <p>
                                You already have the recipes. We&apos;ll handle the orders, payments, and pickup
                                notifications — so you can grow without hiring.
                            </p>
                            <span className={styles.ctaTagline}>
                                (Free onboarding call &amp; QR starter pack for the first 100 home kitchens.)
                            </span>
                        </div>
                        <Link href="/early-adopter" className={styles.ctaBtn}>
                            Become an early adopter
                        </Link>
                    </div>
                    <div className={styles.stickyNote}>
                        <span>Platform free — for life.</span>
                    </div>
                </div>
            </div>

            <FAQSection />

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerGrid}>
                    <div>
                        <h4>Collbine for Business</h4>
                        <p>Home-based food, made easy to discover, order, and pick up.</p>
                    </div>
                    <div>
                        <h4>Product</h4>
                        <ul>
                            <li><a href="#offer">What we offer</a></li>
                            <li><a href="#how">How it works</a></li>
                            <li><a href="#pricing">Pricing</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4>Support</h4>
                        <ul>
                            <li><a href="#faq">FAQ</a></li>
                            <li>
                                <a
                                    href="https://api.whatsapp.com/send/?phone=6588678978&text&type=phone_number&app_absent=0"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    WhatsApp us
                                </a>
                            </li>
                            <li><a href="#">Onboarding guide</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4>Company</h4>
                        <ul>
                            <li><a href="#">About</a></li>
                            <li><a href="/careers">Careers</a></li>
                            <li><a href="/privacy">Privacy</a></li>
                        </ul>
                    </div>
                </div>
                <div className={styles.footerBottom}>
                    <p>&copy; 2026 Collbine for Business. Built with home kitchens, for home kitchens.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
