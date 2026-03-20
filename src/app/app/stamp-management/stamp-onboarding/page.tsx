import type { Metadata } from 'next';
import StampOnBoarding from '../StampOnboarding/StampOnboarding';

export const metadata: Metadata = {
  title: 'Stamp Card Reward System Onboarding | Collbine for Business',
  description:
    'Learn how to onboard your digital stamp reward system: create stamp cards, set reward tiers, and guide customers to scan, earn, and redeem today.',
  keywords: [
    'digital stamp reward system',
    'stamp card onboarding',
    'merchant loyalty rewards',
    'reward tiers',
    'customer stamp tracking',
    'digital stamp card',
    'Singapore loyalty program',
    'Collbine for Business',
  ],
  openGraph: {
    title: 'Stamp Card Reward System Onboarding | Collbine for Business',
    description:
      'Learn how to onboard your digital stamp reward system: create stamp cards, set reward tiers, and guide customers to scan, earn, and redeem today.',
    url: 'https://forbusiness.collbine.com/app/stamp-management/stamp-onboarding',
    siteName: 'Collbine for Business',
    images: [
      {
        url: 'https://forbusiness.collbine.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Digital stamp reward system onboarding',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stamp Card Reward System Onboarding | Collbine for Business',
    description:
      'Learn how to onboard your digital stamp reward system: create stamp cards, set reward tiers, and guide customers to scan, earn, and redeem today.',
    images: ['https://forbusiness.collbine.com/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://forbusiness.collbine.com/app/stamp-management/stamp-onboarding',
  },
};

export default function StampOnboardingPage() {
  return <StampOnBoarding onSuccess={undefined} />;
}

