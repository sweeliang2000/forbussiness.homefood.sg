import Link from 'next/link';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import Badge from '@/components/Badge';
import { EARLY_ADOPTER_SAVINGS, FREE_PLAN, PRO_PLAN } from '@/utility/pricingPlans';
import styles from './PricingSection.module.css';

const isExcluded = (feature) =>
    feature.includes('Not available') || feature.startsWith('Not eligible');

const PlanCard = ({ plan, featured = false }) => (
    <article className={`${styles.planCard} ${featured ? styles.proCard : ''}`}>
        <div className={styles.planTopline}>
            <span className={styles.planName}>{plan.name}</span>
            {featured && <span className={styles.valueBadge}>Best value</span>}
        </div>
        {featured && (
            <div className={styles.promoLine}>
                <s>{plan.price} / month, billed yearly</s>
                <span>Limited-time Founding Seller offer</span>
            </div>
        )}
        <div className={styles.priceRow}>
            <span className={styles.amount}>{featured ? 'S$0.00' : plan.price}</span>
            <span className={styles.cadence}>{featured ? '/ month for life' : plan.cadence}</span>
        </div>
        <p className={styles.planDescription}>{plan.description}</p>
        <ul className={styles.featureList}>
            {plan.features.map((feature) => (
                <li
                    key={feature}
                    className={isExcluded(feature) ? styles.unavailableFeature : ''}
                >
                    <span className={styles.check} aria-hidden="true">
                        {isExcluded(feature) ? (
                            <CloseRoundedIcon className={styles.checkGlyph} />
                        ) : (
                            <CheckRoundedIcon className={styles.checkGlyph} />
                        )}
                    </span>
                    <span>{feature}</span>
                </li>
            ))}
        </ul>
    </article>
);

const PricingSection = () => {
    return (
        <section id="pricing" className={styles.pricingSection}>
            <div className={styles.sectionHead}>
                <Badge variant="orange">Simple, transparent pricing</Badge>
                <h2 className={styles.sectionTitle}>Start free. Upgrade when it earns its place.</h2>
                <p className={styles.sectionSub}>
                    Both plans include your menu, ordering and pickup tools. Pro lowers your payment fees,
                    removes storefront ads and makes your shop eligible for Homebase Verified.
                </p>
            </div>

            <div className={styles.earlyOffer}>
                <div className={styles.offerCopy}>
                    <span className={styles.offerEyebrow}>Limited-time Founding Seller benefit</span>
                    <h3>Get the Pro platform subscription free for life.</h3>
                    <p>
                        Eligible Founding Sellers keep every Pro benefit with a S$0 monthly platform subscription.
                        That saves {EARLY_ADOPTER_SAVINGS} every year. Transaction fees still apply.
                    </p>
                </div>
                <Link href="/early-adopter" className={styles.offerButton}>
                    Apply as a Founding Seller
                </Link>
            </div>

            <div className={styles.planGrid}>
                <PlanCard plan={FREE_PLAN} />
                <PlanCard plan={PRO_PLAN} featured />
            </div>

            <div className={styles.pricingFooter}>
                <p>See the full comparison, ad placement details and verification requirements.</p>
                <Link href="/pricing" className={styles.detailsLink}>
                    View full pricing details <span aria-hidden="true">→</span>
                </Link>
            </div>
        </section>
    );
};

export default PricingSection;
