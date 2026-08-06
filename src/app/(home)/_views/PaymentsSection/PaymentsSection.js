import Link from 'next/link';
import styles from './PaymentsSection.module.css';
import Badge from '@/components/Badge';

const PaymentsSection = () => {
    return (
        <section id="payments" className={styles.paySection}>
            <div className={styles.sectionHead}>
                <Badge variant="brand">Payments &amp; settlement</Badge>
                <h2 className={styles.sectionTitle}>You cook. We handle the money.</h2>
                <p className={styles.sectionSub}>
                    Customers pay online with the methods they already use. You don&apos;t chase payments, you don&apos;t
                    handle cash, and you don&apos;t settle refunds — we do.
                </p>
            </div>

            <div className={styles.payGrid}>
                {/* Payment methods */}
                <div className={styles.payCard}>
                    <h3>Customers can pay with</h3>
                    <div className={styles.methods}>
                        <div className={`${styles.method} ${styles.paynow}`}>
                            <div className={styles.methodIcon}>PN</div>
                            <div>
                                <div className={styles.mname}>PayNow</div>
                                <div className={styles.msub}>Instant QR transfer</div>
                            </div>
                        </div>
                        <div className={`${styles.method} ${styles.paylah}`}>
                            <div className={styles.methodIcon}>Lah!</div>
                            <div>
                                <div className={styles.mname}>PayLah!</div>
                                <div className={styles.msub}>DBS wallet</div>
                            </div>
                        </div>
                        <div className={`${styles.method} ${styles.visa}`}>
                            <div className={styles.methodIcon}>VISA</div>
                            <div>
                                <div className={styles.mname}>Visa</div>
                                <div className={styles.msub}>Credit &amp; debit</div>
                            </div>
                        </div>
                        <div className={`${styles.method} ${styles.master}`}>
                            <div className={styles.methodIcon}>
                                <span className={styles.masterLeft}></span>
                                <span className={styles.masterRight}></span>
                            </div>
                            <div>
                                <div className={styles.mname}>Mastercard</div>
                                <div className={styles.msub}>Credit &amp; debit</div>
                            </div>
                        </div>
                    </div>
                    <p className={styles.payNote}>
                        Every order is paid before you start cooking. No &ldquo;pay on collection&rdquo;, no awkward
                        conversations at the door.
                    </p>
                    <Link href="/pricing" className={styles.pricingLink}>
                        Compare Free and Pro payment fees <span aria-hidden="true">→</span>
                    </Link>
                </div>

                {/* Settlement */}
                <div className={styles.payCard}>
                    <h3>We settle everything</h3>
                    <div className={styles.settleList}>
                        <div className={styles.settleItem}>
                            <div className={styles.check}>✓</div>
                            <div className={styles.ct}>
                                <b>Refunds &amp; chargebacks</b> are handled by us. If a customer disputes, we investigate — you don&apos;t.
                            </div>
                        </div>
                        <div className={styles.settleItem}>
                            <div className={styles.check}>✓</div>
                            <div className={styles.ct}>
                                <b>Monthly payout</b> to your bank account. Take it out when you want, see every order itemised.
                            </div>
                        </div>
                        <div className={styles.settleItem}>
                            <div className={styles.check}>✓</div>
                            <div className={styles.ct}>
                                <b>Transparent fees</b> deducted automatically. Nothing to reconcile by hand.
                            </div>
                        </div>
                        <div className={styles.settleItem}>
                            <div className={styles.check}>✓</div>
                            <div className={styles.ct}>
                                <b>No cash register</b>, no card reader, no POS hardware to buy.
                            </div>
                        </div>
                    </div>
                    <div className={styles.payoutCard}>
                        <span className={styles.payoutKey}>Your April payout</span>
                        <span className={styles.payoutVal}>$2,148.60</span>
                        <span className={styles.payoutDesc}>42 orders · fees already deducted · 1 refund handled for you</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PaymentsSection;
