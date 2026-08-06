import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';
import { EARLY_ADOPTER_SAVINGS } from '@/utility/pricingPlans';
import PricingPlansClient from './PricingPlansClient';
import styles from './Pricing.module.css';

/** @type {import('next').Metadata} */
export const metadata = {
    title: 'Pricing | HomeFood for Business',
    description:
        'Compare HomeFood Free and Pro plans, transaction fees, storefront ads and Homebase Verified eligibility. Early adopters can receive Pro free for life.',
    robots: { index: true, follow: true },
    alternates: { canonical: 'https://business.homefood.sg/pricing' },
};

export default function PricingPage() {
    return (
        <main className={styles.page}>
            <section className={styles.hero}>
                <div className={styles.heroInner}>
                    <span className={styles.eyebrow}>Pricing for home kitchens</span>
                    <h1>Clear pricing. A better reason to start early.</h1>
                    <p>
                        Start with no monthly platform subscription, or choose Pro for lower payment fees,
                        an ad-free storefront and Homebase Verified eligibility.
                    </p>
                    <div className={styles.heroActions}>
                        <Link href="/early-adopter" className={styles.heroPrimary}>
                            Apply as an early adopter <FaArrowRight aria-hidden="true" />
                        </Link>
                        <a href="#compare" className={styles.heroSecondary}>Compare plans</a>
                    </div>
                </div>
            </section>

            <section className={styles.offerSection} aria-labelledby="early-offer-title">
                <div className={styles.offerCard}>
                    <div className={styles.offerPrice} aria-hidden="true">
                        <span className={styles.oldPrice}>Yearly rate S$39.90 / month</span>
                        <strong>S$0.00</strong>
                        <span>limited-time early adopter rate</span>
                    </div>
                    <div className={styles.offerContent}>
                        <span className={styles.offerLabel}>Early adopter offer</span>
                        <h2 id="early-offer-title">Your Pro platform subscription stays free for life.</h2>
                        <p>
                            Approved early adopters receive the Pro plan without the S$39.90 monthly subscription.
                            You keep the lower Pro transaction fees, ad-free shop details and verification eligibility.
                            Payment transaction fees still apply.
                        </p>
                        <div className={styles.savingsLine}>
                            <span>Annual platform saving</span>
                            <strong>{EARLY_ADOPTER_SAVINGS}</strong>
                        </div>
                    </div>
                </div>
            </section>

            <PricingPlansClient />

            <section className={styles.explainerGrid}>
                <article className={styles.explainerCard}>
                    <span className={styles.cardEyebrow}>Ads on the Free plan</span>
                    <h2>Free stays useful because a small ad may support it.</h2>
                    <p>
                        HomeFood displays a small ad placement on your public shop-details page. This helps fund
                        hosting, payment support and continued access to the Free plan. Ads do not change your
                        menu prices or appear inside your menu item descriptions. Upgrade to Pro for an ad-free
                        public storefront.
                    </p>
                </article>

                <article className={`${styles.explainerCard} ${styles.verifiedCard}`}>
                    <div className={styles.verifiedHeading}>
                        <MdVerified className={styles.verifiedIcon} aria-hidden="true" />
                        <div>
                            <span className={styles.cardEyebrow}>Trust and identity</span>
                            <h2>Homebase Verified</h2>
                        </div>
                    </div>
                    <p>
                        The Homebase Verified badge is awarded only after Homebase has checked the seller&apos;s
                        identity, confirmed that the business exists, and personally purchased and sampled the food.
                    </p>
                    <p>
                        The verification visit is conducted anonymously at a random time. Sellers are not informed
                        in advance, and the food is not publicly rated. After a successful verification, the badge
                        appears on the seller&apos;s profile.
                    </p>
                    <div className={styles.disclaimer}>
                        The badge helps buyers feel more confident that a seller is genuine and actively operating.
                        It does not guarantee the quality, taste or experience of every future order.
                    </div>
                </article>
            </section>

            <section className={styles.finalCta}>
                <div>
                    <span>Join while the offer is open</span>
                    <h2>Lock in Pro at S$0 per month.</h2>
                    <p>Keep the platform subscription free for life. Only transaction fees apply.</p>
                </div>
                <Link href="/early-adopter" className={styles.finalButton}>
                    Become an early adopter <FaArrowRight aria-hidden="true" />
                </Link>
            </section>
        </main>
    );
}
