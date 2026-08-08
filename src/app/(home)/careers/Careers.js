import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';

import Badge from '@/components/Badge';
import styles from './Careers.module.css';

const CAREERS_EMAIL = 'support@homefood.sg';

const HIRING_NOTES = [
  'We are a small team in Singapore, so everyone here works close to the merchants we build for.',
  'Roles open irregularly and are usually posted here first.',
];

const Careers = () => {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Badge variant="brand">Careers</Badge>
        <h1 className={styles.heroTitle}>Work on HomeFood</h1>
        <p className={styles.heroLead}>
          We build the tools that let home-based food businesses in Singapore get discovered,
          take orders, and get paid.
        </p>
      </section>

      {/*
        An empty state, stated plainly. The alternative — a search box and
        three filter dropdowns with nothing behind them — looks like a careers
        page but wastes the visitor's time and can only end in a blank result.
      */}
      <section className={styles.emptyState} aria-labelledby="openings">
        <span className={styles.emptyIcon}>
          <WorkOutlineRoundedIcon className={styles.emptyGlyph} aria-hidden="true" />
        </span>
        <h2 id="openings" className={styles.emptyTitle}>No open roles right now</h2>
        <p className={styles.emptyBody}>
          We are not hiring at the moment. When that changes, openings will be listed on this
          page. If you would like to be considered when something opens up, send us a note —
          we keep them and read them.
        </p>
        <a href={`mailto:${CAREERS_EMAIL}?subject=Interest%20in%20working%20at%20HomeFood`} className={styles.emailButton}>
          <MailOutlineRoundedIcon className={styles.emailGlyph} aria-hidden="true" />
          {CAREERS_EMAIL}
        </a>
      </section>

      <section className={styles.notes}>
        <h2 className={styles.notesTitle}>What to expect</h2>
        <ul className={styles.notesList}>
          {HIRING_NOTES.map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li>
            HomeFood is a product of Collbine Pte. Ltd., registered in Singapore. All roles are
            based here.
          </li>
        </ul>
      </section>
    </main>
  );
};

export default Careers;
