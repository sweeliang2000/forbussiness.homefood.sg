import PointsOnboarding from './PointsOnboarding/PointsOnboarding';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Loyalty Points System for Merchants | Collbine for Business',
  description:
    'Set up a loyalty points system for your shop as a merchant. Customise points rules, rewards, and expiry settings in Collbine for Business today.',
  keywords: [
    'loyalty points system',
    'points reward program',
    'merchant loyalty program',
    'custom points rules',
    'loyalty rewards',
    'points expiry',
    'rewards for customers',
    'Collbine for Business',
  ],
  openGraph: {
    title: 'Loyalty Points System for Merchants | Collbine for Business',
    description:
      'Set up a loyalty points system for your shop as a merchant. Customise points rules, rewards, and expiry settings in Collbine for Business today.',
    url: 'https://forbusiness.collbine.com/app/points-management',
    siteName: 'Collbine for Business',
    images: [
      {
        url: 'https://forbusiness.collbine.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Loyalty points system setup',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Loyalty Points System for Merchants | Collbine for Business',
    description:
      'Set up a loyalty points system for your shop as a merchant. Customise points rules, rewards, and expiry settings in Collbine for Business today.',
    images: ['https://forbusiness.collbine.com/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://forbusiness.collbine.com/app/points-management' },
};

const PointsManagement = () => {
    return(
        <PointsOnboarding/>
    )
};

export default PointsManagement;