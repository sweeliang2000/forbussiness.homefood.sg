/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Official Business Details | HomeFood for Business',
  description:
    'Enter your official business details to submit your office information to HomeFood for verification. Your data stays securely private during review.',
  keywords: [
    'official business details',
    'merchant verification',
    'office information',
    'company verification',
    'ACRA business address',
    'UEN verification',
    'HomeFood for Business',
    'merchant onboarding',
  ],
  openGraph: {
    title: 'Official Business Details | HomeFood for Business',
    description:
      'Enter your official business details to submit your office information to HomeFood for verification. Your data stays securely private during review.',
    url: 'https://business.homefood.sg/app/official-business-details',
    siteName: 'HomeFood for Business',
    images: [
      {
        url: 'https://business.homefood.sg/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Official Business Details for HomeFood for Business merchants',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Official Business Details | HomeFood for Business',
    description:
      'Enter your official business details to submit your office information to HomeFood for verification. Your data stays securely private during review.',
    images: ['https://business.homefood.sg/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://business.homefood.sg/app/official-business-details',
  },
};

export default function OfficialBusinessDetailsLayout({ children }) {
  return children;
}

