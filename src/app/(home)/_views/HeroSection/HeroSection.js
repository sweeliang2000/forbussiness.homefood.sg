'use client';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import styles from './HeroSection.module.css';

const HeroSection = () => {
    const reduceMotion = useReducedMotion();
    const enterItem = {
        hidden: {
            opacity: 0,
            transform: reduceMotion ? 'none' : 'translateY(12px)',
        },
        visible: {
            opacity: 1,
            transform: 'translateY(0px)',
            transition: {
                duration: reduceMotion ? 0.2 : 0.5,
                ease: [0.23, 1, 0.32, 1],
            },
        },
    };
    const copySequence = {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: reduceMotion ? 0 : 0.07,
            },
        },
    };
    const tileSequence = {
        hidden: {},
        visible: {
            transition: {
                delayChildren: reduceMotion ? 0 : 0.16,
                staggerChildren: reduceMotion ? 0 : 0.07,
            },
        },
    };

    return (
        <section id="top" className={styles.hero}>
            {/* Left / top: centered copy */}
            <motion.div
                className={styles.heroLeft}
                variants={copySequence}
                initial="hidden"
                animate="visible"
            >
                <motion.div className={styles.heroKicker} variants={enterItem}>
                    <span className={styles.badge}>For home-based food sellers</span>
                </motion.div>
                <motion.h1 className={styles.heroTitle} variants={enterItem}>
                    Your home kitchen, now <em>discoverable</em>. Orders and pickup, handled.
                </motion.h1>
                <motion.p className={styles.heroSub} variants={enterItem}>
                    HomeFood helps customers discover home-based food nearby,{' '}
                    <strong>order or pre-order from your kitchen</strong>, pay online, and come collect it when
                    you&apos;re done cooking. They get notified when the food is about to be ready — and again when
                    it&apos;s ready. <strong>You just cook.</strong>
                </motion.p>
                <motion.div className={styles.heroBtns} variants={enterItem}>
                    <Link href="/early-adopter" className={`${styles.btn} ${styles.primary} ${styles.large}`}>
                        Join as a Founding Seller
                    </Link>
                    <Link href="/founding-sellers" className={`${styles.btn} ${styles.outline} ${styles.large}`}>
                        Why join now
                    </Link>
                </motion.div>
                <motion.div className={styles.heroTrust} variants={enterItem}>
                    <span className={styles.trustDot}></span>
                    <span>
                        Founding Seller offer —{' '}
                        <strong>platform subscription free for life</strong>
                    </span>
                </motion.div>
            </motion.div>

            {/* Right / bottom: 4-col single-row tile grid */}
            <motion.div
                className={styles.heroRight}
                variants={tileSequence}
                initial="hidden"
                animate="visible"
            >
                {/* Tile A: Discover nearby — spans 2 of 4 columns */}
                <motion.div className={`${styles.heroTile} ${styles.tileA}`} variants={enterItem}>
                    <div>
                        <span className={styles.tileABadge}>Discover nearby</span>
                        <h3>Home kitchens, 5 min from your door.</h3>
                        <p>
                            Customers find you on the HomeFood map, browse your menu, and place pre-orders for pickup.
                        </p>
                    </div>
                    <div className={styles.heroList}>
                        <div className={styles.heroItem}>
                            <div className={styles.heroItemIcon}>🍜</div>
                            <div className={styles.heroItemMeta}>
                                <span className={styles.heroItemName}>Auntie May&apos;s Laksa</span>
                                <span className={styles.heroItemDetail}>0.4 km · Ready in 25 min</span>
                            </div>
                            <span className={styles.heroItemPill}>Open</span>
                        </div>
                        <div className={styles.heroItem}>
                            <div className={styles.heroItemIcon}>🥟</div>
                            <div className={styles.heroItemMeta}>
                                <span className={styles.heroItemName}>Dim Sum by Kevin</span>
                                <span className={styles.heroItemDetail}>0.9 km · Pre-order · Fri</span>
                            </div>
                            <span className={styles.heroItemPill}>Pre-order</span>
                        </div>
                        <div className={styles.heroItem}>
                            <div className={styles.heroItemIcon}>🍰</div>
                            <div className={styles.heroItemMeta}>
                                <span className={styles.heroItemName}>Sab&apos;s Basque Cakes</span>
                                <span className={styles.heroItemDetail}>1.2 km · 3 slots left</span>
                            </div>
                            <span className={styles.heroItemPill}>Hot</span>
                        </div>
                    </div>
                </motion.div>

                {/* Tile B: Live order status — column 3 */}
                <motion.div className={`${styles.heroTile} ${styles.tileB}`} variants={enterItem}>
                    <div>
                        <div className={styles.tileTitle}>🔔 Live order status</div>
                        <div className={styles.tileSub}>Order #A-2041 · Butter Chicken × 2</div>
                    </div>
                    <div className={styles.orderBar}></div>
                    <div className={styles.orderSteps}>
                        <div className={`${styles.orderStep} ${styles.done} ${styles.stepReceived}`}>
                            <span className={styles.stepDot}></span>
                            <span>Received</span>
                        </div>
                        <div className={`${styles.orderStep} ${styles.active} ${styles.stepCooking}`}>
                            <span className={styles.stepDot}></span>
                            <span>Cooking</span>
                        </div>
                        <div className={`${styles.orderStep} ${styles.stepAlmostReady}`}>
                            <span className={styles.stepDot}></span>
                            <span>Almost ready</span>
                        </div>
                        <div className={`${styles.orderStep} ${styles.stepReady}`}>
                            <span className={styles.stepDot}></span>
                            <span>Ready</span>
                        </div>
                    </div>
                    <div className={styles.orderNow}>
                        ⏱ Customer notified — 3 min to ready. Be at the door.
                    </div>
                </motion.div>

                {/* Tile C: Customer pays online — column 4 */}
                <motion.div className={`${styles.heroTile} ${styles.tileC}`} variants={enterItem}>
                    <div>
                        <div className={styles.tileTitle}>💳 Customer pays online</div>
                        <div className={styles.tileSub}>You never handle the money.</div>
                    </div>
                    <div className={styles.payRow}>
                        <div className={styles.payChip}>
                            <span className={`${styles.payChipSwatch} ${styles.paynow}`}></span>PayNow
                        </div>
                        <div className={styles.payChip}>
                            <span className={`${styles.payChipSwatch} ${styles.paylah}`}></span>PayLah!
                        </div>
                        <div className={styles.payChip}>
                            <span className={`${styles.payChipSwatch} ${styles.visa}`}></span>Visa
                        </div>
                        <div className={styles.payChip}>
                            <span className={`${styles.payChipSwatch} ${styles.master}`}></span>Mastercard
                        </div>
                    </div>
                    <div className={styles.paySettle}>
                        <b>Monthly payout.</b> We settle refunds, chargebacks &amp; fees.
                    </div>
                </motion.div>
            </motion.div>
        </section>
    );
};

export default HeroSection;
