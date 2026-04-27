import Link from 'next/link';
import styles from './PricingSection.module.css';
import Badge from '@/components/Badge';

const PricingSection = () => {
    return (
        <section id="pricing" className={styles.pricingSection}>
            <div className={styles.sectionHead}>
                <Badge variant="orange">Early adopter offer</Badge>
                <h2 className={styles.sectionTitle}>Join us early. Keep it free — for life.</h2>
                <p className={styles.sectionSub}>
                    Early adopter merchants pay nothing to use the Collbine platform. Ever. The only cost is the standard
                    payment processing fees — the same ones every online business pays.
                </p>
            </div>

            <div className={styles.pricingShell}>
                <div className={styles.pricingCopy}>
                    <h2>
                        Platform subscription,{' '}
                        <span className={styles.accentText}>free for life</span>.
                    </h2>
                    <p>
                        No monthly fee. No per-outlet fee. No hidden charges. If you join during the early adopter
                        window, you keep free platform access forever — even after we launch paid tiers.
                    </p>
                    <ul className={styles.bullets}>
                        <li>Unlimited menu items and pre-order batches</li>
                        <li>Online payments &amp; monthly payouts included</li>
                        <li>Refunds &amp; chargebacks handled by our team</li>
                        <li>Grandfathered pricing — you never get moved to a paid plan</li>
                    </ul>
                </div>

                <div className={styles.pricingCard}>
                    <div className={styles.popularBadge}>Early adopter</div>
                    <h3>Home kitchen plan</h3>
                    <div className={styles.priceRow}>
                        <span className={styles.amt}>$0</span>
                        <span className={styles.per}>/ month, forever</span>
                    </div>
                    <div className={styles.strike}>
                        <s>S$29/mo</s> standard price after early adopter window
                    </div>
                    <div className={styles.feeTable}>
                        <div className={styles.feeRow}>
                            <span className={styles.feeLabel}>PayNow &amp; PayLah!</span>
                            <span className={styles.feeVal}>2%</span>
                        </div>
                        <div className={styles.feeRow}>
                            <span className={styles.feeLabel}>Visa &amp; Mastercard</span>
                            <span className={styles.feeVal}>4% + S$0.50</span>
                        </div>
                    </div>
                    <p className={styles.feeNote}>
                        <b>That&apos;s it.</b> Payment fees go straight to the processor — no markup from us during early adopter.
                    </p>
                    <Link href="/early-adopter" className={styles.applyBtn}>
                        Apply to join — free
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default PricingSection;
