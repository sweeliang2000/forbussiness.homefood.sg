import Image from 'next/image';
import Link from 'next/link';
import {
    FaArrowRight,
    FaAward,
    FaBullhorn,
    FaHandsHelping,
    FaInfinity,
    FaRocket,
    FaStar,
} from 'react-icons/fa';
import styles from './FoundingSellers.module.css';

/** @type {import('next').Metadata} */
export const metadata = {
    title: 'Join as a Founding Seller | HomeFood.sg',
    description:
        'Join HomeFood.sg as a Founding Seller and receive free membership for life, marketing support, launch exposure, a permanent badge and free onboarding assistance.',
    robots: { index: true, follow: true },
    alternates: { canonical: 'https://business.homefood.sg/founding-sellers' },
};

const benefits = [
    {
        title: 'Free membership for life',
        description:
            'Founding Sellers never pay a monthly platform subscription fee. Standard transaction fees still apply.',
        icon: <FaInfinity />,
        featured: true,
        label: 'Lifetime benefit',
    },
    {
        title: 'Marketing support',
        description:
            'HomeFood.sg will promote the platform through social media advertising, influencer partnerships, online campaigns and flyer distribution near MRT stations and community areas.',
        icon: <FaBullhorn />,
    },
    {
        title: 'Opportunities to be featured',
        description:
            'Your food may be selected for HomeFood.sg advertisements, influencer content, social media posts and launch campaigns—at no additional cost.',
        icon: <FaStar />,
    },
    {
        title: 'Founding Seller badge',
        description:
            'Receive a permanent badge showing customers that you were one of the first businesses to join HomeFood.sg.',
        icon: <FaAward />,
    },
    {
        title: 'Priority launch exposure',
        description:
            'Founding Sellers may receive additional visibility through featured listings, launch collections and promotional placements.',
        icon: <FaRocket />,
    },
    {
        title: 'Free onboarding assistance',
        description:
            'We will help you set up your shop, upload your menu and prepare your listing for launch.',
        icon: <FaHandsHelping />,
    },
];

export default function FoundingSellersPage() {
    return (
        <main className={styles.page}>
            <section className={styles.hero}>
                <div className={styles.heroGrid}>
                    <div className={styles.heroCopy}>
                        <span className={styles.eyebrow}>Limited founding seller places</span>
                        <h1>Join HomeFood.sg as a Founding Seller.</h1>
                        <p>
                            Grow your home-based food business with marketing, online payments and greater
                            exposure—all in one platform.
                        </p>
                        <div className={styles.heroActions}>
                            <Link href="/early-adopter" className={styles.primaryButton}>
                                Apply as a Founding Seller <FaArrowRight aria-hidden="true" />
                            </Link>
                            <a href="#benefits" className={styles.secondaryButton}>
                                See your benefits
                            </a>
                        </div>
                        <p className={styles.heroFinePrint}>
                            No monthly subscription fee for life for eligible Founding Sellers.
                            Transaction fees still apply.
                        </p>
                    </div>

                    <div className={styles.badgeStage} aria-label="Founding Seller badge preview">
                        <div className={styles.badgeGlow} aria-hidden="true" />
                        <div className={styles.badgeCard}>
                            <div className={styles.brandRow}>
                                <Image src="/logo.png" alt="" width={42} height={42} className={styles.logo} />
                                <span>HomeFood.sg</span>
                            </div>
                            <div className={styles.badgeMark}>
                                <FaAward aria-hidden="true" />
                            </div>
                            <span className={styles.badgeKicker}>Original member</span>
                            <strong>Founding Seller</strong>
                            <span className={styles.badgeYear}>Established with us · 2026</span>
                        </div>
                        <div className={styles.lifetimeChip}>
                            <FaInfinity aria-hidden="true" />
                            <span><strong>S$0</strong> membership for life</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.promiseStrip} aria-label="Founding Seller highlights">
                <div>
                    <strong>Permanent</strong>
                    <span>Founding Seller badge</span>
                </div>
                <div>
                    <strong>S$0</strong>
                    <span>Monthly membership for life</span>
                </div>
                <div>
                    <strong>Included</strong>
                    <span>Personal onboarding help</span>
                </div>
            </section>

            <section id="benefits" className={styles.benefitsSection}>
                <div className={styles.sectionHeading}>
                    <span>Join early and receive</span>
                    <h2>More than software. A head start.</h2>
                    <p>
                        Founding Sellers receive lasting platform savings and additional support designed to
                        help their food reach more people from launch.
                    </p>
                </div>

                <div className={styles.benefitGrid}>
                    {benefits.map((benefit) => (
                        <article
                            key={benefit.title}
                            className={`${styles.benefitCard} ${benefit.featured ? styles.featuredBenefit : ''}`}
                        >
                            <div className={styles.benefitTopline}>
                                <span className={styles.benefitIcon} aria-hidden="true">{benefit.icon}</span>
                                {benefit.label && <span className={styles.benefitLabel}>{benefit.label}</span>}
                            </div>
                            <h3>{benefit.title}</h3>
                            <p>{benefit.description}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className={styles.badgeExplainer}>
                <div className={styles.badgeExplainerIcon} aria-hidden="true">
                    <FaAward />
                </div>
                <div className={styles.badgeExplainerCopy}>
                    <span>Your place in the beginning</span>
                    <h2>A permanent signal that you helped start HomeFood.sg.</h2>
                    <p>
                        The Founding Seller badge identifies your business as one of the platform&apos;s earliest
                        members. It remains on your profile as HomeFood.sg grows, giving customers context about
                        how long you have been part of the community.
                    </p>
                </div>
            </section>

            <section className={styles.finalCta}>
                <div>
                    <span>Limited places available</span>
                    <h2>Be part of HomeFood.sg from the beginning.</h2>
                    <p>
                        Apply now for lifetime free membership, launch support and your permanent Founding Seller badge.
                    </p>
                </div>
                <Link href="/early-adopter" className={styles.finalButton}>
                    Join as a Founding Seller <FaArrowRight aria-hidden="true" />
                </Link>
            </section>
        </main>
    );
}
