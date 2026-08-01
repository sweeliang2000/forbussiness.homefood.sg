import ContentClient from './pageClient';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Subscription Dashboard | HomeFood for Business',
  description:
    'Get updates and quick information in your HomeFood for Business dashboard, including subscription status and a release checklist. Stay on track.',
  keywords: [
    'HomeFood for Business',
    'subscription dashboard',
    'HomeFood updates',
    'release checklist',
    'stamp management',
    'loyalty terminal',
    'manage billing',
  ],
  openGraph: {
    title: 'Subscription Dashboard | HomeFood for Business',
    description:
      'Get updates and quick information in your HomeFood for Business dashboard, including subscription status and a release checklist. Stay on track.',
    url: 'https://business.homefood.sg/app',
    siteName: 'HomeFood for Business',
    images: [
      {
        url: 'https://business.homefood.sg/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Subscription Dashboard | HomeFood for Business',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Subscription Dashboard | HomeFood for Business',
    description:
      'Get updates and quick information in your HomeFood for Business dashboard, including subscription status and a release checklist. Stay on track.',
    images: ['https://business.homefood.sg/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://business.homefood.sg/app' },
};

export default function Content() {
  return <ContentClient />;
}
