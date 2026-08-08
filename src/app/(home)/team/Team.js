import Link from 'next/link';
import Image from 'next/image';
import { FaLinkedinIn } from 'react-icons/fa6';

import Badge from '@/components/Badge';
import styles from './Team.module.css';

// Mirrors homefood.sg/team — the same people run both sides of the product.
const CO_FOUNDERS = [
  {
    name: 'Chua Swee Liang',
    title: 'Co-Founder & CEO',
    image: '/images/team/chua-swee-liang.png',
    linkedin: 'https://www.linkedin.com/in/sweeliang/?originalSubdomain=sg',
  },
  {
    name: 'Jes Kwek Hui Min',
    title: 'Co-Founder & CMO',
    image: '/images/team/jes-kwek-hui-min.png',
    linkedin: 'https://www.linkedin.com/in/jeskwek/',
  },
];

const Team = () => {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Badge variant="brand">Our team</Badge>
        <h1 className={styles.heroTitle}>The people behind HomeFood</h1>
        <p className={styles.heroLead}>
          A small team spanning product, growth, and technology, building a platform that turns
          home kitchens into businesses customers can find, order from, and come back to.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="co-founders">
        <h2 id="co-founders" className={styles.sectionTitle}>Co-founders</h2>
        <ul className={styles.memberList}>
          {CO_FOUNDERS.map((member) => (
            <li key={member.name} className={styles.member}>
              <a
                href={member.linkedin}
                className={styles.memberPhotoWrap}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${member.name} on LinkedIn`}
              >
                <Image
                  src={member.image}
                  alt={member.name}
                  width={400}
                  height={400}
                  className={styles.memberPhoto}
                  sizes="(max-width: 640px) 45vw, 220px"
                />
                <span className={styles.linkedinBadge} aria-hidden="true">
                  <FaLinkedinIn />
                </span>
              </a>
              <p className={styles.memberName}>{member.name}</p>
              <p className={styles.memberTitle}>{member.title}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.footerNote}>
        <p>
          HomeFood is a product of Collbine Pte. Ltd., registered in Singapore.{' '}
          <Link href="/about">Read more about the company</Link>.
        </p>
      </section>
    </main>
  );
};

export default Team;
