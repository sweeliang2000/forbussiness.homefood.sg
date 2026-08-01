import SuccessClient from './SuccessClient';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Subscription Success | HomeFood for Business',
  description:
    'Subscription successful on HomeFood for Business. Your payment was processed. Return to your settings or manage billing anytime from the dashboard.',
  keywords: [
    'HomeFood for Business',
    'subscription success',
    'payment successful',
    'manage billing',
    'business dashboard',
    'loyalty terminal',
  ],
  openGraph: {
    title: 'Subscription Success | HomeFood for Business',
    description:
      'Subscription successful on HomeFood for Business. Your payment was processed. Return to your settings or manage billing anytime from the dashboard.',
    url: 'https://business.homefood.sg/app/subscription/success',
    siteName: 'HomeFood for Business',
    images: [
      {
        url: 'https://business.homefood.sg/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Subscription successful on HomeFood for Business',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Subscription Success | HomeFood for Business',
    description:
      'Subscription successful on HomeFood for Business. Your payment was processed. Return to your settings or manage billing anytime from the dashboard.',
    images: ['https://business.homefood.sg/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://business.homefood.sg/app/subscription/success',
  },
};

export default function Success() {
  return <SuccessClient />;
} 