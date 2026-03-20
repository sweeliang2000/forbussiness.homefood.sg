import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { PiCashRegister } from 'react-icons/pi';
import { LuRocket } from 'react-icons/lu';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Merchant Loyalty Terminal | Collbine for Business',
  description:
    "Process loyalty stamp-and-redeem rewards for your Singapore customers with Collbine's merchant loyalty terminal. Enable stamps and redeem instantly.",
  keywords: [
    'loyalty terminal',
    'merchant rewards',
    'stamp collection',
    'redeem rewards',
    'digital loyalty card',
    'Singapore loyalty program',
    'Collbine for Business',
    'rewards redemption',
  ],
  openGraph: {
    title: 'Merchant Loyalty Terminal | Collbine for Business',
    description:
      "Process loyalty stamp-and-redeem rewards for your Singapore customers with Collbine's merchant loyalty terminal. Enable stamps and redeem instantly.",
    url: 'https://forbusiness.collbine.com/terminal',
    siteName: 'Collbine for Business',
    images: [
      {
        url: 'https://forbusiness.collbine.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Collbine for Business Loyalty Terminal',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Merchant Loyalty Terminal | Collbine for Business',
    description:
      "Process loyalty stamp-and-redeem rewards for your Singapore customers with Collbine's merchant loyalty terminal. Enable stamps and redeem instantly.",
    images: ['https://forbusiness.collbine.com/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://forbusiness.collbine.com/terminal' },
};

export default function TerminalGatePage() {
  return (
    <div className={styles.root}>
      <HeaderSection
        title="Loyalty Terminal"
        description="Access the terminal to process loyalty transactions."
        showButton={false}
        className={undefined}
        isSuccess={false}
        isError={false}
        setShowError={undefined}
        isDisabled={false}
        errorMessage={''}
        successMessage={''}
        setShowSuccess={undefined}
        infoMessage={''}
        showCancelButton={false}
        onCancel={undefined}
        warningMessage={''}
      />

      <div className={styles.cardWrap}>
        <ContentCard className={styles.card}>
          <div className={styles.hero}>
            <div className={styles.iconWrap}>
              <PiCashRegister className={styles.icon} aria-hidden />
            </div>
            <h2 className={styles.title}>Reward system not in production</h2>
            <p className={styles.subtitle}>
              The terminal is available only when your reward system is released
              and live. Complete your setup and release to start using the Loyalty
              Terminal.
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

