'use client';
import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import styles from './FAQSection.module.css';
import Badge from '@/components/Badge';
import { FAQS, FEATURED_FAQS } from '../../_data/faqs';

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
                {FEATURED_FAQS.map((faq, i) => (
                    <div key={i} className={`${styles.faqItem} ${openIndex === i ? styles.open : ''}`}>
                        <button
                            className={styles.faqQ}
                            onClick={() => toggle(i)}
                            aria-expanded={openIndex === i}
                            aria-controls={`faq-answer-${i}`}
                        >
                            {faq.question}
                            <AddRoundedIcon className={styles.faqIcon} aria-hidden="true" />
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
            <Link href="/faq" className={styles.seeAll}>
                See all {FAQS.length} questions
                <ArrowForwardRoundedIcon className={styles.seeAllIcon} aria-hidden="true" />
            </Link>
        </section>
    );
};

export default FAQSection;
