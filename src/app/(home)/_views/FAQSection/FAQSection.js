'use client';
import { useState } from 'react';
import styles from './FAQSection.module.css';
import { FaChevronDown } from 'react-icons/fa6';

const FAQSection = () => {
    const [openIndex, setOpenIndex] = useState(null);

    const faqs = [
        {
            question: "Is Collbine free?",
            answer: "Yes, Collbine offers a free plan to get you started. You can explore our features and see how it works for your business. For advanced features and higher customer limits, check out our <a href='#pricing'>pricing plans</a>."
        },
        {
            question: "Can I have point systems or membership?",
            answer: "Absolutely! Collbine supports both point systems and membership programs. You can customize your loyalty program to match your business needs. <a href='/app'>Learn more</a> about setting up your reward system."
        },
        {
            question: "How can I release?",
            answer: "To release your business on Collbine, you'll need to complete the checklist requirements including official business details, customer-facing details, and stamp system setup. Once ready, you can <a href='/app/release/submission'>submit for review</a>. It typically takes 1-2 working days for approval."
        },
        {
            question: "What features does Collbine offer?",
            answer: "Collbine provides a comprehensive loyalty platform including stamp cards, point systems, membership programs, and advanced analytics. You can <a href='#features'>explore all features</a> or <a href='/signup'>start a free trial</a> to see them in action."
        }
    ];

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
                    {faqs.map((faq, index) => (
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
                            {index < faqs.length - 1 && (
                                <div className={styles.faqDivider} />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FAQSection;

