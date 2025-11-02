import styles from './WhyUsSection.module.css';
import Badge from '@/components/Badge';
import FeatureImageCard from '@/components/FeatureImageCard';
import Abutton from '@/components/Buttons/Abutton';
import { FaLightbulb } from 'react-icons/fa';

const WhyUsSection = () => {
    const features = [
        {
            image: "/images/pages/landing/hero/card_image.png",
            title: "Customizable Loyalty Systems",
            description: "Create unique reward programs tailored to your business needs with flexible point systems and rewards.",
            icon: "🎯"
        },
        {
            image: "/images/pages/landing/hero/card_image.png",
            title: "Customer Engagement",
            description: "Keep customers coming back with engaging stamp cards, points, and personalized rewards.",
            icon: "💝"
        },
        {
            image: "/images/pages/landing/hero/card_image.png",
            title: "Easy Management",
            description: "Manage your loyalty program effortlessly with our intuitive dashboard and analytics.",
            icon: "📊"
        }
    ];

    return (
        <section id="features" className={styles.whyUsSection}>
            <div className={styles.sectionContainer}>
                <div className={styles.sectionHeader}>
                    <Badge variant="blue">Why Choose Collbine?</Badge>

                    <div className={styles.sectionContent}>
                        <h2 className={styles.sectionTitle}>Discover. Collect. Redeem. Repeat.</h2>
                        <p className={styles.sectionSubtitle}>
                            Most loyalty systems are forgotten because customers have nowhere to find them. Ours is discoverable via app.
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
                        <span>No more forgotten loyalty programs.</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WhyUsSection;

