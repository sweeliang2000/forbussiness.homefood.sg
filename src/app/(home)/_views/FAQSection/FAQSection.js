'use client';
import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import styles from './FAQSection.module.css';
import Badge from '@/components/Badge';

const faqs = [
    {
        question: 'Do I need a commercial kitchen or license?',
        answer:
            "HomeFood is built for home-based food (HBF) sellers operating within SFA's HBF guidelines. You don't need a commercial kitchen, but you're responsible for meeting the usual HBF food safety requirements — same as you would on WhatsApp or Instagram today.",
    },
    {
        question: 'How do the payment fees actually work?',
        answer:
            "For every paid order, PayNow / PayLah! is 2%, and Visa / Mastercard is 4% + S$0.50. The fee is deducted automatically before we pay you out. So a S$20 PayNow order nets you S$19.60, and a S$20 card order nets you S$18.70. No other fees during the early adopter window.",
    },
    {
        question: 'When do I actually get paid?',
        answer:
            "Your earnings build up in your HomeFood balance as orders complete. You can withdraw once a month to your linked bank account. Every payout comes with an itemised statement showing orders, fees, and any refunds.",
    },
    {
        question: 'What if a customer asks for a refund?',
        answer:
            "Route the refund request through us. Our team reviews it, handles any card chargeback admin, and settles it directly — so you're not chasing the customer or your bank. You just see the adjustment on your next payout statement.",
    },
    {
        question: 'Will the platform really stay free?',
        answer:
            "Yes. Early adopter accounts are grandfathered — you keep the free plan for the lifetime of your HomeFood account, even after we start charging new sign-ups. This offer is intentionally limited to our first cohort so we can grow with you.",
    },
    {
        question: 'Do I need a POS or card reader?',
        answer:
            'No hardware at all. Customers pay on their own phone when they order. Your "terminal" is just the HomeFood merchant app on any phone or laptop — you see incoming orders, mark them "almost ready" and "ready", and that\'s it.',
    },
];

const FAQSection = () => {
    const [openIndex, setOpenIndex] = useState(null);
    const reduceMotion = useReducedMotion();

    const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

    return (
        <section id="faq" className={styles.faqSection}>
            <div className={styles.sectionHead}>
                <Badge variant="brand">Common questions</Badge>
                <h2 className={styles.sectionTitle}>Answers before you ask.</h2>
            </div>
            <div className={styles.faqList}>
                {faqs.map((faq, i) => (
                    <div key={i} className={`${styles.faqItem} ${openIndex === i ? styles.open : ''}`}>
                        <button
                            className={styles.faqQ}
                            onClick={() => toggle(i)}
                            aria-expanded={openIndex === i}
                            aria-controls={`faq-answer-${i}`}
                        >
                            {faq.question}
                            <span className={styles.faqIcon} aria-hidden="true">＋</span>
                        </button>
                        <AnimatePresence initial={false}>
                            {openIndex === i && (
                                <motion.div
                                    id={`faq-answer-${i}`}
                                    className={styles.faqA}
                                    initial={{ height: reduceMotion ? 'auto' : 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: reduceMotion ? 'auto' : 0, opacity: 0 }}
                                    transition={reduceMotion
                                        ? { height: { duration: 0 }, opacity: { duration: 0.2 } }
                                        : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                                >
                                    <p>{faq.answer}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default FAQSection;
