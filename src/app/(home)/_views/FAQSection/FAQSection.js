'use client';
import { useMemo, useState } from 'react';
import styles from './FAQSection.module.css';
import { FaChevronDown } from 'react-icons/fa6';

const FAQSection = () => {
    const [openIndex, setOpenIndex] = useState(null);
    const [showAll, setShowAll] = useState(false);

    const faqs = [
        {
            question: "Is Collbine free to use?",
            answer: "Collbine is free to set up. When you’re ready to release your business for customers to use, you’ll need an active subscription. See <a href='#pricing'>pricing plans</a> for details."
        },
        {
            question: "What is Scan to Win?",
            answer: "Scan to Win is a customer campaign where customers scan your QR to win rewards. The purpose is to drive more visits, increase customer engagement, and help new customers discover your business through a simple scan."
        },
        {
            question: "Do you provide Scan to Win banner service?",
            answer: "Yes. We can help design and provide a Scan to Win banner for your store. <a href='/contact'>Contact us</a> to arrange it. For 1-year subscriptions, your first Scan to Win banner is free."
        },
        {
            question: "What campaigns can I run with Collbine?",
            answer: "You can run <strong>Stamp Cards</strong> and <strong>Scan to Win</strong>.<br /><br /><strong>Stamp Cards</strong> reward repeat visits (e.g., “Buy 9, get 1 free”).<br /><strong>Scan to Win</strong> drives engagement and new customer discovery through a quick QR scan and prize mechanic."
        },
        {
            question: "How long does setup take?",
            answer: "Most businesses can create their program and publish their business page the same day. If your account needs review before going live, you can <a href='/app/release/submission'>submit for review</a> — approval typically takes within 1 working day."
        },
        {
            question: "Do I need new hardware or a POS integration?",
            answer: "No — you can start without new hardware. Collbine is designed to work alongside your existing checkout process. If you have special integration needs, our team can help you plan the best setup."
        },
        {
            question: "How do customers collect stamps?",
            answer: "Customers collect stamps through a simple, fast flow at checkout (for example via QR or code-based confirmation, depending on your setup). You control the rules, so it stays secure and consistent."
        },
        {
            question: "Can I cancel or change plans anytime?",
            answer: "Yes — you can upgrade, downgrade, or cancel anytime. Your plan changes take effect based on your billing cycle, and you’ll always be able to view your current plan in your account."
        },
        {
            question: "What analytics do I get?",
            answer: "You’ll see performance metrics like customer growth, repeat visits, and reward redemptions. For deeper insights and higher limits, check the <a href='#pricing'>plan comparison</a>."
        },
        {
            question: "Is my business and customer data secure?",
            answer: "We take security seriously and follow best practices to protect your data. If you need documentation for compliance or internal review, contact us and we’ll share the relevant details."
        }
    ];

    const initialVisibleCount = 5;
    const visibleFaqs = useMemo(() => {
        if (showAll) return faqs;
        return faqs.slice(0, initialVisibleCount);
    }, [showAll, faqs]);

    const toggleFAQ = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section id="faq" className={styles.faqSection}>
            <div className={styles.faqContainer}>
                <div className={styles.faqLeftColumn}>
                    <h2 className={styles.faqTitle}>
                        Frequently asked<br />questions
                    </h2>
                </div>

                <div className={styles.faqRightColumn}>
                    {visibleFaqs.map((faq, index) => (
                        <div key={index} className={styles.faqItem}>
                            <button
                                className={styles.faqQuestion}
                                onClick={() => toggleFAQ(index)}
                            >
                                <span>{faq.question}</span>
                                <FaChevronDown 
                                    className={`${styles.chevronIcon} ${openIndex === index ? styles.rotated : ''}`}
                                />
                            </button>
                            {openIndex === index && (
                                <div 
                                    className={styles.faqAnswer}
                                    dangerouslySetInnerHTML={{ __html: faq.answer }}
                                />
                            )}
                            {index < visibleFaqs.length - 1 && (
                                <div className={styles.faqDivider} />
                            )}
                        </div>
                    ))}

                    {faqs.length > initialVisibleCount && (
                        <button
                            type="button"
                            className={styles.showMoreButton}
                            onClick={() => {
                                setShowAll((prev) => {
                                    const next = !prev;
                                    if (!next && openIndex != null && openIndex >= initialVisibleCount) {
                                        setOpenIndex(null);
                                    }
                                    return next;
                                });
                            }}
                        >
                            {showAll ? 'Show less' : 'Show more'}
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
};

export default FAQSection;

