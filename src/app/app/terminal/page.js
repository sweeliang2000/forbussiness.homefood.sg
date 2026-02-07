'use client';

import Link from 'next/link';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { PiCashRegister } from 'react-icons/pi';
import { LuRocket } from 'react-icons/lu';
import styles from './page.module.css';

export default function TerminalGatePage() {
  return (
    <div className={styles.root}>
      <HeaderSection
        title="Loyalty Terminal"
        description="Access the terminal to process loyalty transactions."
        showButton={false}
      />

      <div className={styles.cardWrap}>
        <ContentCard className={styles.card}>
          <div className={styles.hero}>
            <div className={styles.iconWrap}>
              <PiCashRegister className={styles.icon} aria-hidden />
            </div>
            <h2 className={styles.title}>Reward system not in production</h2>
            <p className={styles.subtitle}>
              The terminal is available only when your reward system is released and live. Complete your setup and release to start using the Loyalty Terminal.
            </p>
          </div>

          <div className={styles.ctaBlock}>
            <p className={styles.ctaLabel}>Ready to get started?</p>
            <Link href="/app" className={styles.primaryButton}>
              <LuRocket className={styles.buttonIcon} aria-hidden />
              Start creating now
            </Link>
          </div>
        </ContentCard>
      </div>
    </div>
  );
}
