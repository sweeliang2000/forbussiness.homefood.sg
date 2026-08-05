'use client';
import { motion, useReducedMotion } from 'motion/react';
import styles from './HowItWorksSection.module.css';
import Badge from '@/components/Badge';

const steps = [
    {
        num: 1,
        title: 'Discover & choose',
        description: 'Customer opens HomeFood, browses home kitchens nearby, and picks dishes from your menu.',
        tag: 'Map + menu',
    },
    {
        num: 2,
        title: 'Order or pre-order & pay',
        description:
            'They place an order for now or pre-order for a future batch, then pay with PayNow, PayLah, Visa, or Mastercard.',
        tag: 'Online payment',
    },
    {
        num: 3,
        title: '"Almost ready" alert',
        description:
            'When the food is close to done, HomeFood pings the customer so they can leave home at the right time.',
        tag: 'Heads-up push',
    },
    {
        num: 4,
        title: '"Ready" — collect at your home',
        description: 'A final "it\'s ready" notification. They arrive, verify the order, and leave happy.',
        tag: 'Home pickup',
    },
];

const HowItWorksSection = () => {
    const reduceMotion = useReducedMotion();
    const gridVariants = {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: reduceMotion ? 0 : 0.06,
            },
        },
    };
    const cardVariants = {
        hidden: {
            opacity: 0,
            transform: reduceMotion ? 'none' : 'translateY(12px)',
        },
        visible: {
            opacity: 1,
            transform: 'translateY(0px)',
            transition: {
                duration: reduceMotion ? 0.2 : 0.4,
                ease: [0.23, 1, 0.32, 1],
            },
        },
    };

    return (
        <section id="how" className={styles.howSection}>
            <div className={styles.sectionHead}>
                <Badge variant="green">How it works</Badge>
                <h2 className={styles.sectionTitle}>
                    From &ldquo;I&apos;m hungry&rdquo; to &ldquo;thanks, see you next week&rdquo; — in four steps.
                </h2>
                <p className={styles.sectionSub}>
                    A friction-free path for the customer. A clean, predictable shift for you.
                </p>
            </div>
            <motion.div
                className={styles.howGrid}
                variants={gridVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
            >
                {steps.map((step) => (
                    <motion.div
                        key={step.num}
                        className={`${styles.howCard} ${step.num === 3 ? styles.alertCard : ''}`}
                        variants={cardVariants}
                    >
                        <div className={styles.howNum}>{step.num}</div>
                        <h4>{step.title}</h4>
                        <p>{step.description}</p>
                        {step.num === 3 && (
                            <div className={styles.alertBubble}>
                                <span className={styles.alertDot} />
                                <span>Almost ready — your order is being prepared</span>
                            </div>
                        )}
                        <span className={styles.tag}>{step.tag}</span>
                    </motion.div>
                ))}
            </motion.div>
        </section>
    );
};

export default HowItWorksSection;
