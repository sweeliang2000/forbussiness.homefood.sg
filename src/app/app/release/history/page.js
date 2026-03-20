import HistoryView from "./History";

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Release History | Collbine for Business',
  description:
    'View the Collbine for Business release history and past releases to see what your merchant app shipped before, and manage updates in one place.',
  keywords: [
    'release history',
    'merchant app updates',
    'past app releases',
    'merchant dashboard',
    'app release log',
    'Collbine for Business',
    'Scan to Win releases',
  ],
  openGraph: {
    title: 'Release History | Collbine for Business',
    description:
      'View the Collbine for Business release history and past releases to see what your merchant app shipped before, and manage updates in one place.',
    url: 'https://forbusiness.collbine.com/app/release/history',
    siteName: 'Collbine for Business',
    images: [
      {
        url: 'https://forbusiness.collbine.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Collbine for Business Release History',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Release History | Collbine for Business',
    description:
      'View the Collbine for Business release history and past releases to see what your merchant app shipped before, and manage updates in one place.',
    images: ['https://forbusiness.collbine.com/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://forbusiness.collbine.com/app/release/history',
  },
};


export default function HistoryPage() {

  return (
    <HistoryView/>
  );
}
