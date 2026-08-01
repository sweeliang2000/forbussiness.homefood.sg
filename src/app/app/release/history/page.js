import HistoryView from "./History";

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Release History | HomeFood for Business',
  description:
    'View the HomeFood for Business release history and past releases to see what your merchant app shipped before, and manage updates in one place.',
  keywords: [
    'release history',
    'merchant app updates',
    'past app releases',
    'merchant dashboard',
    'app release log',
    'HomeFood for Business',
    'Scan to Win releases',
  ],
  openGraph: {
    title: 'Release History | HomeFood for Business',
    description:
      'View the HomeFood for Business release history and past releases to see what your merchant app shipped before, and manage updates in one place.',
    url: 'https://business.homefood.sg/app/release/history',
    siteName: 'HomeFood for Business',
    images: [
      {
        url: 'https://business.homefood.sg/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HomeFood for Business Release History',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Release History | HomeFood for Business',
    description:
      'View the HomeFood for Business release history and past releases to see what your merchant app shipped before, and manage updates in one place.',
    images: ['https://business.homefood.sg/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://business.homefood.sg/app/release/history',
  },
};


export default function HistoryPage() {

  return (
    <HistoryView/>
  );
}
