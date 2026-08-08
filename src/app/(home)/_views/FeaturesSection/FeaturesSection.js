'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';

import styles from './FeaturesSection.module.css';
import Badge from '@/components/Badge';

/**
 * The ordering system, and only the ordering system. HomeFood for Business
 * is not the loyalty product — no stamp cards, scan-to-win, or rewards
 * belong in here.
 */
const features = [
    {
        id: 'discover',
        image: '/images/home/what-we-offer/discovered-home-based-food.png',
        alt: 'Discover home-based food nearby on HomeFood',
        bgClass: 'a1',
        label: 'Discover',
        title: 'Get discovered by hungry neighbours',
        description:
            'Your kitchen shows up on the HomeFood map with your menu, prep times, and pickup window. New customers can find you — without you paying for ads.',
        detail: [
            {
                heading: 'A shop page you control',
                body: 'Your name, description, photos, and menu live on a page you publish yourself. Nothing goes live to customers until you say so.',
            },
            {
                heading: 'Hours that reflect reality',
                body: 'Set the days and times you actually take orders. When you are closed, your page says so instead of taking orders you cannot cook.',
            },
            {
                heading: 'Found by location',
                body: 'Customers browsing nearby see how far away you are and when your next batch is ready, so the trip is worth making.',
            },
        ],
    },
    {
        id: 'orders',
        image: '/images/home/what-we-offer/take-orders.png',
        alt: 'Take orders and pre-orders on HomeFood',
        bgClass: 'a2',
        label: 'Order & pre-order',
        title: 'Take orders and pre-orders in advance',
        description:
            'Customers browse your menu, place an order for now or pre-order for a future batch, pay online, and get a receipt. You see every order in one neat queue.',
        detail: [
            {
                heading: 'Cook to a number you already know',
                body: 'Set the dates you cook and how many slots each one has. Pre-orders close when you say, so you shop and prep against a confirmed count.',
            },
            {
                heading: 'One queue, not a hundred chats',
                body: 'Every order arrives in the same place with its items, options, and notes. No scrolling back through messages to find what someone asked for.',
            },
            {
                heading: 'Sell out without closing',
                body: 'Mark a single item — or one option within an item — sold out for the rest of the day, and keep taking orders for everything else.',
            },
        ],
    },
    {
        id: 'pickup',
        image: '/images/home/what-we-offer/home-pickup.png',
        alt: 'Home pickup notifications on HomeFood',
        bgClass: 'a3',
        label: 'Collect at home',
        title: 'Home pickup, done gracefully',
        description:
            "When the food is about to be ready, the customer gets a heads-up. When it's ready, they get notified again — so they arrive right on time at your door.",
        detail: [
            {
                heading: 'Two warnings, not one',
                body: 'An "almost ready" notice gets them moving, and a "ready" notice brings them to the door. Fewer people waiting on your doorstep while you plate.',
            },
            {
                heading: 'Status you tap, not type',
                body: 'Move an order through cooking, almost ready, and ready from your phone. The customer sees each step without you messaging anyone.',
            },
            {
                heading: 'No money at the door',
                body: 'Payment is settled online before collection, so the handover is just handing over food.',
            },
        ],
    },
];

const FeaturesSection = () => {
    const [openId, setOpenId] = useState(null);
    const reduceMotion = useReducedMotion();

    return (
        <section id="features" className={styles.featuresSection}>
            <div className={styles.sectionHead}>
                <Badge variant="brand">Features</Badge>
                <h2 className={styles.sectionTitle}>
                    Three tools. One platform. Zero extra apps.
                </h2>
                <p className={styles.sectionSub}>
                    Everything you need to get found, take orders, and handle pickups — built in from day one.
                </p>
            </div>
            <div className={styles.featureGrid}>
                {features.map((feature) => {
                    const isOpen = openId === feature.id;
                    const panelId = `feature-detail-${feature.id}`;
                    return (
                        <article
                            key={feature.id}
                            className={`${styles.featureCard} ${isOpen ? styles.open : ''}`}
                        >
                            <div className={`${styles.featureArt} ${styles[feature.bgClass]}`}>
                                <span className={styles.featureLabel}>{feature.label}</span>
                                <div className={styles.phoneWrap}>
                                    <Image
                                        src={feature.image}
                                        alt={feature.alt}
                                        fill
                                        className={styles.phoneImg}
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    />
                                </div>
                            </div>
                            <h3>{feature.title}</h3>
                            <p className={styles.featureBody}>{feature.description}</p>

                            {/* The headline case is on the card; the detail is one
                                level deeper, opened only by people who want it. */}
                            <button
                                type="button"
                                className={styles.disclosure}
                                onClick={() => setOpenId(isOpen ? null : feature.id)}
                                aria-expanded={isOpen}
                                aria-controls={panelId}
                            >
                                {isOpen ? 'Hide details' : 'See details'}
                                <ExpandMoreRoundedIcon
                                    className={styles.disclosureIcon}
                                    aria-hidden="true"
                                />
                            </button>

                            <AnimatePresence initial={false}>
                                {isOpen && (
                                    <motion.div
                                        id={panelId}
                                        className={styles.detail}
                                        initial={{ height: reduceMotion ? 'auto' : 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: reduceMotion ? 'auto' : 0, opacity: 0 }}
                                        transition={
                                            reduceMotion
                                                ? { height: { duration: 0 }, opacity: { duration: 0.2 } }
                                                : { duration: 0.24, ease: [0.23, 1, 0.32, 1] }
                                        }
                                    >
                                        <dl className={styles.detailList}>
                                            {feature.detail.map((item) => (
                                                <div key={item.heading} className={styles.detailItem}>
                                                    <dt>{item.heading}</dt>
                                                    <dd>{item.body}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </article>
                    );
                })}
            </div>
        </section>
    );
};

export default FeaturesSection;
