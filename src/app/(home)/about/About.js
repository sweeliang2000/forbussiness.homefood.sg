import Link from 'next/link';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';

import Badge from '@/components/Badge';
import styles from './About.module.css';

const WHAT_WE_DO = [
  {
    Icon: StorefrontRoundedIcon,
    title: 'Get discovered',
    description:
      'Customers find home kitchens near them on the HomeFood map, browse the menu, and see exactly when the next batch is ready.',
  },
  {
    Icon: ScheduleRoundedIcon,
    title: 'Take pre-orders',
    description:
      'Set your own slots and quotas so you cook to a known number. Customers are told when the food is nearly ready, and again when it is.',
  },
  {
    Icon: PaymentsRoundedIcon,
    title: 'Get paid online',
    description:
      'PayNow, PayLah!, and cards are collected before collection. We handle refunds and chargebacks, so no money changes hands at your door.',
  },
];

const About = () => {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Badge variant="brand">About HomeFood</Badge>
        <h1 className={styles.heroTitle}>
          Built in Singapore, for the kitchens already in it.
        </h1>
        <p className={styles.heroLead}>
          Thousands of people in Singapore already cook and bake for a living from home. What
          most of them lack is not skill — it is a way to be found, to take orders without a
          hundred chat messages, and to get paid before the food leaves the kitchen. HomeFood
          is that missing piece.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="what-we-do">
        <h2 id="what-we-do" className={styles.sectionTitle}>What HomeFood does</h2>
        <ul className={styles.grid}>
          {WHAT_WE_DO.map((item) => (
            <li key={item.title} className={styles.card}>
              <span className={styles.cardIcon}>
                <item.Icon className={styles.cardGlyph} aria-hidden="true" />
              </span>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardBody}>{item.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="our-approach">
        <h2 id="our-approach" className={styles.sectionTitle}>How we think about it</h2>
        <div className={styles.prose}>
          <p>
            A home kitchen is not a small restaurant. Batches are limited, hours are personal,
            and the person cooking is usually also the person answering messages, packing bags,
            and meeting customers at the door. Software built for restaurants assumes staff,
            stock, and a counter. We assume none of those.
          </p>
          <p>
            So the product is shaped around small batches, limited slots, and doorstep pickup.
            You decide when you cook and how much. Customers order ahead and collect. Payment is
            settled online, and refunds and chargebacks are ours to handle — not yours.
          </p>
          <p>
            We would rather grow alongside our earliest merchants than squeeze them. That is why
            Founding Sellers keep their platform subscription free for life, and why our fees are
            published in full rather than buried.
          </p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="company">
        <h2 id="company" className={styles.sectionTitle}>The company</h2>
        <div className={styles.companyCard}>
          <dl className={styles.companyList}>
            <div className={styles.companyRow}>
              <dt>Registered name</dt>
              <dd>COLLBINE PTE. LTD.</dd>
            </div>
            <div className={styles.companyRow}>
              <dt>UEN</dt>
              <dd>202600319E</dd>
            </div>
            <div className={styles.companyRow}>
              <dt>Registered address</dt>
              <dd>254 Ang Mo Kio Avenue 4 #10-143, Kebun Baru View, Singapore 560254</dd>
            </div>
            <div className={styles.companyRow}>
              <dt>Contact</dt>
              <dd><a href="mailto:support@homefood.sg">support@homefood.sg</a></dd>
            </div>
          </dl>
          <p className={styles.companyNote}>
            HomeFood is a product of Collbine Pte. Ltd. The consumer app and{' '}
            <a href="https://homefood.sg" target="_blank" rel="noopener noreferrer">homefood.sg</a>{' '}
            are operated by the same company. <Link href="/team">Meet the team</Link>.
          </p>
        </div>
      </section>

      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Cooking from home already?</h2>
        <p className={styles.ctaLead}>
          Founding Sellers keep their platform subscription free for life.
        </p>
        <div className={styles.ctaActions}>
          <Link href="/early-adopter" className={`${styles.btn} ${styles.btnPrimary}`}>
            Join as a Founding Seller
          </Link>
          <Link href="/pricing" className={`${styles.btn} ${styles.btnOutline}`}>
            See pricing
          </Link>
        </div>
      </section>
    </main>
  );
};

export default About;
