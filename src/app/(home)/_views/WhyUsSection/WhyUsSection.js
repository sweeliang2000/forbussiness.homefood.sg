import styles from './WhyUsSection.module.css';
import Badge from '@/components/Badge';

const reasons = [
    {
        icon: '🚀',
        title: 'Go live this week',
        description:
            'Add your menu, set pickup slots, print your QR. Your kitchen is discoverable in under an hour — no hardware to buy.',
    },
    {
        icon: '🔒',
        title: 'You never touch money',
        description:
            'Customers pay online. We handle refunds and chargebacks. You just cook, notify, and hand over the order.',
    },
    {
        icon: '📈',
        title: 'Repeat customers, automatically',
        description:
            'Every happy pickup is a reason to come back. Pre-order batches make sure regulars know your next drop.',
    },
    {
        icon: '🤝',
        title: 'Grandfathered forever',
        description:
            "Join us now and your plan stays free as we grow. We'd rather win together than squeeze our earliest merchants.",
    },
];

const WhyUsSection = () => {
    return (
        <section id="why" className={styles.whySection}>
            <div className={styles.sectionHead}>
                <Badge variant="blue">Why grow with us</Badge>
                <h2 className={styles.sectionTitle}>Built around how home kitchens actually work.</h2>
                <p className={styles.sectionSub}>
                    Not a clone of a restaurant POS. A tool shaped around small batches, limited slots, and a
                    doorstep-pickup experience.
                </p>
            </div>
            <div className={styles.whyGrid}>
                {reasons.map((r, i) => (
                    <div key={i} className={styles.whyCard}>
                        <div className={styles.icon}>{r.icon}</div>
                        <div>
                            <h4>{r.title}</h4>
                            <p>{r.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default WhyUsSection;
