import SuccessClient from './SuccessClient';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Subscription Success | Collbine for Business',
  description:
    'Subscription successful on Collbine for Business. Your payment was processed. Return to your settings or manage billing anytime from the dashboard.',
  keywords: [
    'Collbine for Business',
    'subscription success',
    'payment successful',
    'manage billing',
    'business dashboard',
    'loyalty terminal',
  ],
  openGraph: {
    title: 'Subscription Success | Collbine for Business',
    description:
      'Subscription successful on Collbine for Business. Your payment was processed. Return to your settings or manage billing anytime from the dashboard.',
    url: 'https://forbusiness.collbine.com/app/subscription/success',
    siteName: 'Collbine for Business',
    images: [
      {
        url: 'https://forbusiness.collbine.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Subscription successful on Collbine for Business',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Subscription Success | Collbine for Business',
    description:
      'Subscription successful on Collbine for Business. Your payment was processed. Return to your settings or manage billing anytime from the dashboard.',
    images: ['https://forbusiness.collbine.com/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://forbusiness.collbine.com/app/subscription/success',
  },
};

export default function Success() {
  return <SuccessClient />;
} 