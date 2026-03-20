import ContentClient from './pageClient';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Subscription Dashboard | Collbine for Business',
  description:
    'Get updates and quick information in your Collbine for Business dashboard, including subscription status and a release checklist. Stay on track.',
  keywords: [
    'Collbine for Business',
    'subscription dashboard',
    'Collbine updates',
    'release checklist',
    'stamp management',
    'loyalty terminal',
    'manage billing',
  ],
  openGraph: {
    title: 'Subscription Dashboard | Collbine for Business',
    description:
      'Get updates and quick information in your Collbine for Business dashboard, including subscription status and a release checklist. Stay on track.',
    url: 'https://forbusiness.collbine.com/app',
    siteName: 'Collbine for Business',
    images: [
      {
        url: 'https://forbusiness.collbine.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Subscription Dashboard | Collbine for Business',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Subscription Dashboard | Collbine for Business',
    description:
      'Get updates and quick information in your Collbine for Business dashboard, including subscription status and a release checklist. Stay on track.',
    images: ['https://forbusiness.collbine.com/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://forbusiness.collbine.com/app' },
};

export default function Content() {
  return <ContentClient />;
}
