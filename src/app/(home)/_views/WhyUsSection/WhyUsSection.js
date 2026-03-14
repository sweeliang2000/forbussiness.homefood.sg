import styles from './WhyUsSection.module.css';
import Badge from '@/components/Badge';
import FeatureImageCard from '@/components/FeatureImageCard';
import Abutton from '@/components/Buttons/Abutton';
import { FaLightbulb } from 'react-icons/fa';

const WhyUsSection = () => {
    const features = [
        {
            image: "/images/pages/landing/hero/card_image.png",
            title: "Discover",
            description: "Make your loyalty and offers easy to find. When customers know where to look, they come back.",
            icon: "🎯"
        },
        {
            image: "/images/pages/landing/hero/card_image.png",
            title: "Scan to Win",
            description: "Random rewards work like a blind box. Customers want to come back to see what they get next.",
            icon: "🎁"
        },
        {
            image: "/images/pages/landing/hero/card_image.png",
            title: "Centralised Loyalty Card",
            description: "One place for stamps and rewards. <strong>No forgotten reward systems, no lost cards.</strong>",
            icon: "📋"
        }
    ];

    return (
        <section id="features" className={styles.whyUsSection}>
            <div className={styles.sectionContainer}>
                <div className={styles.sectionHeader}>
                    <Badge variant="blue">Why Choose Collbine?</Badge>

                    <div className={styles.sectionContent}>
                        <h2 className={styles.sectionTitle}>No More Forgotten Reward Systems.</h2>
                        <p className={styles.sectionSubtitle}>
                            Discover. Scan to win with random rewards that bring customers back. One centralised loyalty card so stamps and rewards are never lost.
                        </p>
                    </div>
                </div>
                <div className={styles.featuresGrid}>
                    {features.map((feature, index) => (
                        <FeatureImageCard
                            key={index}
                            image={feature.image}
                            title={feature.title}
                            description={feature.description}
                            imageWidth={420}
                            imageHeight={320}
                        />
                    ))}
                </div>

                {/* CTA Section */}
                <div className={styles.ctaBubble}>
                    <div className={styles.ctaContent}>
                        <div className={styles.lightbulbIcon}>
                            <FaLightbulb />
                        </div>
                        <div className={styles.ctaText}>
                            <p>
                                Your customers already have their stamps — remind them to return, redeem, and boost your sales.
                            </p>
                            <span className={styles.tagline}>(Free for your first merchants)</span>
                        </div>
                        <div className={styles.ctaButton}>
                            <Abutton href="/signup" variant="primary" size="medium">
                                Get Started for Free
                            </Abutton>
                        </div>
                    </div>
                    <div className={styles.stickyNote}>
                        <span>No more forgotten reward systems.</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WhyUsSection;

