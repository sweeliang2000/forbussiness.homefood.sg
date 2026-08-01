import PointsOnboarding from './PointsOnboarding/PointsOnboarding';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Loyalty Points System for Merchants | HomeFood for Business',
  description:
    'Set up a loyalty points system for your shop as a merchant. Customise points rules, rewards, and expiry settings in HomeFood for Business today.',
  keywords: [
    'loyalty points system',
    'points reward program',
    'merchant loyalty program',
    'custom points rules',
    'loyalty rewards',
    'points expiry',
    'rewards for customers',
    'HomeFood for Business',
  ],
  openGraph: {
    title: 'Loyalty Points System for Merchants | HomeFood for Business',
    description:
      'Set up a loyalty points system for your shop as a merchant. Customise points rules, rewards, and expiry settings in HomeFood for Business today.',
    url: 'https://business.homefood.sg/app/points-management',
    siteName: 'HomeFood for Business',
    images: [
      {
        url: 'https://business.homefood.sg/og-image.png',
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
    title: 'Loyalty Points System for Merchants | HomeFood for Business',
    description:
      'Set up a loyalty points system for your shop as a merchant. Customise points rules, rewards, and expiry settings in HomeFood for Business today.',
    images: ['https://business.homefood.sg/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://business.homefood.sg/app/points-management' },
};

const PointsManagement = () => {
    return(
        <PointsOnboarding/>
    )
};

export default PointsManagement;