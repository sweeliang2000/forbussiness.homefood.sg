/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Scan-to-Win Collection Status Analytics | HomeFood for Business',
  description:
    'Scan-to-Win collection status analytics for merchants: see how many rewards were collected and redeemed each day on your QR campaigns, at a glance.',
  keywords: [
    'scan to win',
    'collection status',
    'scan-to-win analytics',
    'reward redemption',
    'redeemed rewards',
    'QR loyalty',
    'merchant dashboard',
  ],
  openGraph: {
    title: 'Scan-to-Win Collection Status Analytics | HomeFood for Business',
    description:
      'Scan-to-Win collection status analytics for merchants: see how many rewards were collected and redeemed each day on your QR campaigns, at a glance.',
    url: 'https://business.homefood.sg/app/scan-to-win/collection-status',
    siteName: 'HomeFood for Business',
    images: [
      {
        url: 'https://business.homefood.sg/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Scan-to-Win collection status analytics',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scan-to-Win Collection Status Analytics | HomeFood for Business',
    description:
      'Scan-to-Win collection status analytics for merchants: see how many rewards were collected and redeemed each day on your QR campaigns, at a glance.',
    images: ['https://business.homefood.sg/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://business.homefood.sg/app/scan-to-win/collection-status',
  },
};

export default function CollectionStatusLayout({ children }) {
  return children;
}

