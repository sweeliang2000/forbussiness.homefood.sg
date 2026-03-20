import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Scan-to-Win Rewards Setup | Collbine for Business',
  description:
    'Create your Scan to Win rewards campaign in the Collbine for Business dashboard. Configure reward chances and QR card images for merchants in Singapore.',
  keywords: [
    'scan to win',
    'QR loyalty rewards',
    'merchant dashboard',
    'Singapore loyalty program',
    'reward chance setup',
    'QR reward campaign',
    'digital loyalty card',
  ],
  openGraph: {
    title: 'Scan-to-Win Rewards Setup | Collbine for Business',
    description:
      'Create your Scan to Win rewards campaign in the Collbine for Business dashboard. Configure reward chances and QR card images for merchants in Singapore.',
    url: 'https://forbusiness.collbine.com/app/scan-to-win',
    siteName: 'Collbine for Business',
    images: [
      {
        url: 'https://forbusiness.collbine.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Scan-to-Win Rewards Setup',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scan-to-Win Rewards Setup | Collbine for Business',
    description:
      'Create your Scan to Win rewards campaign in the Collbine for Business dashboard. Configure reward chances and QR card images for merchants in Singapore.',
    images: ['https://forbusiness.collbine.com/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://forbusiness.collbine.com/app/scan-to-win',
  },
};

export default function ScanToWinLayout({ children }: { children: ReactNode }) {
  return children;
}
