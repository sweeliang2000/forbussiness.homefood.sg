'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import { FaWhatsapp } from 'react-icons/fa';

import Badge from '@/components/Badge';
import { FAQS, FAQ_CATEGORIES } from '../_data/faqs';
import styles from './FAQ.module.css';

const SUPPORT_EMAIL = 'support@homefood.sg';
const WHATSAPP_URL =
  'https://api.whatsapp.com/send/?phone=6588678978&text&type=phone_number&app_absent=0';

const normalise = (value) => value.toLowerCase().trim();

const FAQ = () => {
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState(null);
  const reduceMotion = useReducedMotion();

  const trimmed = normalise(query);

  // Matches the answer as well as the question: people search for the word
  // they have in mind ("chargeback", "PayLah"), which is usually in the body.
  const matches = useMemo(() => {
    if (!trimmed) return FAQS;
    const terms = trimmed.split(/\s+/);
    return FAQS.filter((faq) => {
      const haystack = normalise(`${faq.question} ${faq.answer}`);
      return terms.every((term) => haystack.includes(term));
    });
  }, [trimmed]);

  const grouped = useMemo(
    () =>
      FAQ_CATEGORIES.map((category) => ({
        ...category,
        items: matches.filter((faq) => faq.category === category.id),
      })).filter((category) => category.items.length > 0),
    [matches]
  );

  const searching = trimmed.length > 0;
  const noResults = searching && matches.length === 0;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Badge variant="brand">Common questions</Badge>
        <h1 className={styles.heroTitle}>Answers before you ask.</h1>
        <p className={styles.heroLead}>
          Fees, payouts, pre-orders, and plans — the things sellers ask us most.
        </p>

        <div className={styles.searchWrap}>
          <SearchRoundedIcon className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search questions"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search frequently asked questions"
            aria-describedby="faq-result-count"
          />
          {searching ? (
            <button
              type="button"
              className={styles.clearButton}
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <CloseRoundedIcon className={styles.clearIcon} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {/* Announced to screen readers as the count changes, so search is not
            a silent, sighted-only affordance. */}
        <p id="faq-result-count" className={styles.resultCount} role="status" aria-live="polite">
          {searching
            ? `${matches.length} ${matches.length === 1 ? 'result' : 'results'} for “${query.trim()}”`
            : `${FAQS.length} questions`}
        </p>
      </section>

      {noResults ? (
        <section className={styles.noResults}>
          <h2 className={styles.noResultsTitle}>No answer for “{query.trim()}”</h2>
          <p className={styles.noResultsBody}>
            That one is not covered yet. Ask us directly — a real person reads these, and if it
            is a common question it ends up on this page.
          </p>
          <div className={styles.contactActions}>
            <a
              className={`${styles.contactBtn} ${styles.contactPrimary}`}
              href={`${WHATSAPP_URL}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaWhatsapp className={styles.contactGlyph} aria-hidden="true" />
              Message us on WhatsApp
            </a>
            <a
              className={`${styles.contactBtn} ${styles.contactSecondary}`}
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Question: ${query.trim()}`)}`}
            >
              <MailOutlineRoundedIcon className={styles.contactGlyph} aria-hidden="true" />
              Email {SUPPORT_EMAIL}
            </a>
          </div>
        </section>
      ) : (
        <div className={styles.groups}>
          {grouped.map((category) => (
            <section key={category.id} className={styles.group} aria-labelledby={category.id}>
              <h2 id={category.id} className={styles.groupTitle}>{category.label}</h2>
              <div className={styles.list}>
                {category.items.map((faq) => {
                  const key = faq.question;
                  const isOpen = openKey === key;
                  return (
                    <div key={key} className={`${styles.item} ${isOpen ? styles.open : ''}`}>
                      <button
                        type="button"
                        className={styles.question}
                        onClick={() => setOpenKey(isOpen ? null : key)}
                        aria-expanded={isOpen}
                      >
                        {faq.question}
                        <AddRoundedIcon className={styles.itemIcon} aria-hidden="true" />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            className={styles.answer}
                            initial={{ height: reduceMotion ? 'auto' : 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: reduceMotion ? 'auto' : 0, opacity: 0 }}
                            transition={
                              reduceMotion
                                ? { height: { duration: 0 }, opacity: { duration: 0.2 } }
                                : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }
                            }
                          >
                            <p>{faq.answer}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Always available, not only when search fails: someone who read an
          answer and still has a follow-up should not have to search badly to
          find a way to reach us. */}
      {!noResults ? (
        <section className={styles.stillStuck}>
          <h2 className={styles.stillStuckTitle}>Still stuck?</h2>
          <p className={styles.stillStuckBody}>
            If your question is not here, ask us. We usually reply on WhatsApp within a few
            hours during the day.
          </p>
          <div className={styles.contactActions}>
            <a
              className={`${styles.contactBtn} ${styles.contactPrimary}`}
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaWhatsapp className={styles.contactGlyph} aria-hidden="true" />
              Message us on WhatsApp
            </a>
            <a
              className={`${styles.contactBtn} ${styles.contactSecondary}`}
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              <MailOutlineRoundedIcon className={styles.contactGlyph} aria-hidden="true" />
              Email {SUPPORT_EMAIL}
            </a>
          </div>
        </section>
      ) : null}
    </main>
  );
};

export default FAQ;
