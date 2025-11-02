'use client';
import styles from './LandingPage.module.css';
import Abutton from '@/components/Buttons/Abutton';
import HeroSection from '../HeroSection/HeroSection';
import StatementSection from '../StatementSection/StatementSection';
import WhyUsSection from '../WhyUsSection/WhyUsSection';
import FeaturesSection from '../FeaturesSection/FeaturesSection';

const LandingPage = () => {
    const testimonials = [
        {
            name: "Sarah Chen",
            business: "Generation Coffee",
            text: "Collbine has transformed how we engage with our customers. Our repeat visits increased by 40% in just 3 months!",
            rating: 5
        },
        {
            name: "Mike Rodriguez",
            business: "Keen's Bagelry",
            text: "The stamp card feature is perfect for our bakery. Customers love collecting stamps and we love the increased loyalty.",
            rating: 5
        },
        {
            name: "Lisa Wong",
            business: "Urban Bistro",
            text: "Easy to set up, easy to manage. Our customers appreciate the modern approach to loyalty rewards.",
            rating: 5
        }
    ];

    return (
        <div className={styles.landingPage}>
            <HeroSection />

            <StatementSection />

            <WhyUsSection />

            <FeaturesSection />

            {/* Testimonials Section */}
            <section className={styles.testimonialsSection}>
                <div className={styles.sectionContainer}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>What Our Customers Say</h2>
                        <p className={styles.sectionSubtitle}>
                            Join hundreds of satisfied businesses across Singapore
                        </p>
                    </div>
                    <div className={styles.testimonialsGrid}>
                        {testimonials.map((testimonial, index) => (
                            <div key={index} className={styles.testimonialCard}>
                                <div className={styles.rating}>
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <span key={i} className={styles.star}>⭐</span>
                                    ))}
                                </div>
                                <p className={styles.testimonialText}>&ldquo;{testimonial.text}&rdquo;</p>
                                <div className={styles.testimonialAuthor}>
                                    <strong>{testimonial.name}</strong>
                                    <span>{testimonial.business}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className={styles.pricingSection}>
                <div className={styles.sectionContainer}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Simple, Transparent Pricing</h2>
                        <p className={styles.sectionSubtitle}>
                            Choose the plan that works best for your business
                        </p>
                    </div>
                    <div className={styles.pricingGrid}>
                        <div className={styles.pricingCard}>
                            <div className={styles.pricingHeader}>
                                <h3>Starter</h3>
                                <div className={styles.price}>
                                    <span className={styles.currency}>$</span>
                                    <span className={styles.amount}>29</span>
                                    <span className={styles.period}>/month</span>
                                </div>
                            </div>
                            <ul className={styles.features}>
                                <li>Up to 500 customers</li>
                                <li>Basic stamp cards</li>
                                <li>Email support</li>
                                <li>Basic analytics</li>
                            </ul>
                            <Abutton href="/signup" variant="primary" size="medium">Get Started</Abutton>
                        </div>

                        <div className={`${styles.pricingCard} ${styles.popular}`}>
                            <div className={styles.popularBadge}>Most Popular</div>
                            <div className={styles.pricingHeader}>
                                <h3>Professional</h3>
                                <div className={styles.price}>
                                    <span className={styles.currency}>$</span>
                                    <span className={styles.amount}>79</span>
                                    <span className={styles.period}>/month</span>
                                </div>
                            </div>
                            <ul className={styles.features}>
                                <li>Up to 2,000 customers</li>
                                <li>Advanced loyalty programs</li>
                                <li>Priority support</li>
                                <li>Advanced analytics</li>
                                <li>Custom branding</li>
                            </ul>
                            <Abutton href="/signup" variant="primary" size="medium">Get Started</Abutton>
                        </div>

                        <div className={styles.pricingCard}>
                            <div className={styles.pricingHeader}>
                                <h3>Enterprise</h3>
                                <div className={styles.price}>
                                    <span className={styles.currency}>$</span>
                                    <span className={styles.amount}>199</span>
                                    <span className={styles.period}>/month</span>
                                </div>
                            </div>
                            <ul className={styles.features}>
                                <li>Unlimited customers</li>
                                <li>All features included</li>
                                <li>24/7 phone support</li>
                                <li>API access</li>
                                <li>Custom integrations</li>
                            </ul>
                            <Abutton href="/signup" variant="primary" size="medium">Get Started</Abutton>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className={styles.ctaSection}>
                <div className={styles.ctaContainer}>
                    <h2 className={styles.ctaTitle}>Ready to Build Customer Loyalty?</h2>
                    <p className={styles.ctaSubtitle}>
                        Join hundreds of Singapore businesses using Collbine to grow their customer base
                    </p>
                    <div className={styles.ctaButtons}>
                        <Abutton href="/signup" variant="white" size="large">
                            Start Your Free Trial
                        </Abutton>
                        <Abutton href="#contact" variant="outline-white" size="large">
                            Contact Sales
                        </Abutton>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerContainer}>
                    <div className={styles.footerContent}>
                        <div className={styles.footerSection}>
                            <h4>Collbine for Business</h4>
                            <p>Empowering Singapore merchants with smart loyalty solutions.</p>
                        </div>
                        <div className={styles.footerSection}>
                            <h4>Product</h4>
                            <ul>
                                <li><a href="#features">Features</a></li>
                                <li><a href="#pricing">Pricing</a></li>
                                <li><a href="/app">Dashboard</a></li>
                            </ul>
                        </div>
                        <div className={styles.footerSection}>
                            <h4>Support</h4>
                            <ul>
                                <li><a href="#contact">Contact Us</a></li>
                                <li><a href="/help">Help Center</a></li>
                                <li><a href="/api-docs">API Docs</a></li>
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
