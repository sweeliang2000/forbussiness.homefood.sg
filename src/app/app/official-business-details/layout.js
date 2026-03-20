/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Official Business Details | Collbine for Business',
  description:
    'Enter your official business details to submit your office information to Collbine for verification. Your data stays securely private during review.',
  keywords: [
    'official business details',
    'merchant verification',
    'office information',
    'company verification',
    'ACRA business address',
    'UEN verification',
    'Collbine for Business',
    'merchant onboarding',
  ],
  openGraph: {
    title: 'Official Business Details | Collbine for Business',
    description:
      'Enter your official business details to submit your office information to Collbine for verification. Your data stays securely private during review.',
    url: 'https://forbusiness.collbine.com/app/official-business-details',
    siteName: 'Collbine for Business',
    images: [
      {
        url: 'https://forbusiness.collbine.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Official Business Details for Collbine for Business merchants',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Official Business Details | Collbine for Business',
    description:
      'Enter your official business details to submit your office information to Collbine for verification. Your data stays securely private during review.',
    images: ['https://forbusiness.collbine.com/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://forbusiness.collbine.com/app/official-business-details',
  },
};

export default function OfficialBusinessDetailsLayout({ children }) {
  return children;
}

