import Badge from "@/components/Badge";
import Image from "next/image";
import Abutton from '@/components/Buttons/Abutton';
import styles from "./FeaturesSection.module.css";

const FeaturesSection = () => {
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
                            <h3>Issue stamps in seconds with just a phone number</h3>
                            <p className={styles.featureItemStepsContentItem1Description}>Easily reward customers by entering their phone number. Stamps are saved automatically, even if they haven&rsquo;t created an account yet.</p>

                            <div className={styles.featureItemStepsContentItem1Step}>
                                <p>1. Enter Customer Phone Number</p>
                                <p>Key in the customer&rsquo;s phone number into your merchant system.</p>
                            </div>

                            <div className={styles.featureItemStepsContentItem1Step}>
                                <p>2. Customer Collects Stamps Automatically</p>
                                <p>The system automatically adds stamps to their account — even if they haven&rsquo;t signed up yet. Once they create an account, their past stamps are instantly linked.</p>
                            </div>

                            <div className={styles.featureItemStepsContentItem1Step}>
                                <p>3. Customer Redeems Rewards</p>
                                <p>When customers collect enough stamps, they can redeem rewards directly from your shop or app.</p>
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
                                src="/images/pages/landing/hero/card_image.png"
                                alt="Feature illustration"
                                width={520}
                                height={420}
                                className={styles.featureImage}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default FeaturesSection;