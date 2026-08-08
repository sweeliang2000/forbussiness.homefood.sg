'use client';
import styles from './LandingPage.module.css';
import HeroSection from '../HeroSection/HeroSection';
import StatementSection from '../StatementSection/StatementSection';
import FeaturesSection from '../FeaturesSection/FeaturesSection';
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

            <FeaturesSection />

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
                        <Link href="/founding-sellers" className={styles.ctaBtn}>
                            See Founding Seller benefits
                        </Link>
                    </div>
                    <div className={styles.stickyNote}>
                        <span>Platform free — for life.</span>
                    </div>
                </div>
            </div>

            <FAQSection />
        </div>
    );
};

export default LandingPage;
