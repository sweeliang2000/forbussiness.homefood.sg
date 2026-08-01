import Image from 'next/image';
import styles from './OfferSection.module.css';
import Badge from '@/components/Badge';

const offers = [
    {
        image: '/images/home/what-we-offer/discovered-home-based-food.png',
        alt: 'Discover home-based food nearby on HomeFood',
        bgClass: 'a1',
        label: 'Discover',
        title: 'Get discovered by hungry neighbours',
        description:
            'Your kitchen shows up on the HomeFood map with your menu, prep times, and pickup window. New customers can find you — without you paying for ads.',
        learn: 'Live menu & opening hours →',
    },
    {
        image: '/images/home/what-we-offer/take-orders.png',
        alt: 'Take orders and pre-orders on HomeFood',
        bgClass: 'a2',
        label: 'Order & pre-order',
        title: 'Take orders and pre-orders in advance',
        description:
            'Customers browse your menu, place an order for now or pre-order for a future batch, pay online, and get a receipt. You see every order in one neat queue.',
        learn: 'Order queue for today and the week →',
    },
    {
        image: '/images/home/what-we-offer/home-pickup.png',
        alt: 'Home pickup notifications on HomeFood',
        bgClass: 'a3',
        label: 'Collect at home',
        title: 'Home pickup, done gracefully',
        description:
            "When the food is about to be ready, the customer gets a heads-up. When it's ready, they get notified again — so they arrive right on time at your door.",
        learn: 'Two-stage "almost ready" & "ready" alerts →',
    },
];

const OfferSection = () => {
    return (
        <section id="offer" className={styles.offerSection}>
            <div className={styles.sectionHead}>
                <Badge variant="brand">What we offer</Badge>
                <h2 className={styles.sectionTitle}>
                    Three tools. One platform. Zero extra apps.
                </h2>
                <p className={styles.sectionSub}>
                    Everything you need to get found, take orders, and handle pickups — built in from day one.
                </p>
            </div>
            <div className={styles.offerGrid}>
                {offers.map((offer, i) => (
                    <div key={i} className={styles.offerCard}>
                        <div className={`${styles.offerArt} ${styles[offer.bgClass]}`}>
                            <span className={styles.offerLabel}>{offer.label}</span>
                            <div className={styles.phoneWrap}>
                                <Image
                                    src={offer.image}
                                    alt={offer.alt}
                                    fill
                                    className={styles.phoneImg}
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                />
                            </div>
                        </div>
                        <h3>{offer.title}</h3>
                        <p>{offer.description}</p>
                        <span className={styles.learn}>{offer.learn}</span>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default OfferSection;
