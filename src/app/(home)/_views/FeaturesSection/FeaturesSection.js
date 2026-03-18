import Badge from "@/components/Badge";
import Image from "next/image";
import Link from "next/link";
import Abutton from '@/components/Buttons/Abutton';
import FeatureImageCard from '@/components/FeatureImageCard';
import styles from "./FeaturesSection.module.css";

const FeaturesSection = () => {
    const features = [
        {
            image: "/images/pages/features/card.png",
            title: "Customisable Card Designs",
            description: "Create unique reward programs tailored to your business needs with flexible point systems and rewards.",
        },
        {
            image: "/images/pages/features/banner.png",
            title: "Scan-to-Win Banner Rewards",
            description: "Grab attention with a scan-to-win banner and surprise “blind box” rewards—customers scan, reveal, and come back for more.",
        },
        {
            image: "/images/pages/features/reward-card.png",
            title: "Custom Designs, Controlled Rewards",
            description: "Customise the look and the offer rules—set limits like a maximum quantity per reward so you stay in control of every giveaway.",
        }
    ];

    return (
        <section className={styles.featuresSection}>

            <div className={styles.sectionContainer}>
                <div className={styles.sectionHeader}>
                    <Badge variant="blue">Why Choose Collbine?</Badge>

                    <div className={styles.sectionContent}>
                        <h2 className={styles.sectionTitle}>Features that make you money.</h2>
                        <p className={styles.sectionSubtitle}>
                            Our loyalty system provides convenient for your customers to collect stamps and redeem rewards. Most importantly, it helps you grow your sales.
                        </p>
                    </div>
                </div>
            </div>

            <div className={styles.featuresContainer}>
                <div className={styles.featureItemSteps}>
                    <div className={styles.featureItemStepsContent}>
                        <div className={styles.featureItemStepsContentItem1}>
                            <Badge variant="blue" className={styles.smallBadge}>How Collbine Works?</Badge>
                            <h3>Redeem rewards in seconds at your terminal</h3>
                            <p className={styles.featureItemStepsContentItem1Description}>
                                No apps to open or QR codes to scan. Find the customer by phone number, apply rewards, and when it&rsquo;s time to redeem, simply select the reward on your terminal and confirm.
                            </p>

                            <div className={styles.featureItemStepsContentItem1Step}>
                                <p>1. Find the Customer</p>
                                <p>Enter their phone number on your Collbine terminal to pull up their rewards instantly.</p>
                            </div>

                            <div className={styles.featureItemStepsContentItem1Step}>
                                <p>2. Select the Reward</p>
                                <p>Browse the customer&rsquo;s available rewards on your terminal and select the one they want to redeem.</p>
                            </div>

                            <div className={styles.featureItemStepsContentItem1Step}>
                                <p>3. Confirm &amp; Notify</p>
                                <p>Confirm the redemption at checkout and we&rsquo;ll instantly send the customer a notification with their updated reward status.</p>
                            </div>

                            <Abutton 
                                href="/" 
                                variant="primary" 
                                size="small"
                                className={styles.learnMoreButton}
                            >
                                Learn More
                            </Abutton>
                        </div>

                        <div className={styles.featureItemStepsContentItem2}>
                            <Image
                                src="/images/pages/features/terminal.png"
                                alt="Feature illustration"
                                width={520}
                                height={420}
                                className={styles.featureImage}
                            />
                        </div>
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
                            isImageNarrow={true}
                        />
                    ))}
                </div>

                <div className={styles.findOutMoreContainer}>
                    <Link href="/" className={styles.findOutMoreButton}>
                        Find out more
                    </Link>
                </div>
            </div>
        </section>
    )
}

export default FeaturesSection;