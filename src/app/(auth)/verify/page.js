import Verify from './Verify';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'OTP Verification | Collbine for Business',
  description:
    'Finish OTP verification to access your Collbine for Business account. Enter your one-time password code to confirm email or phone and continue securely.',
  keywords: [
    'OTP verification',
    'one-time password',
    'verify OTP',
    'email verification',
    'phone verification',
    'Collbine for Business',
    'secure account access',
  ],
  openGraph: {
    title: 'OTP Verification | Collbine for Business',
    description:
      'Finish OTP verification to access your Collbine for Business account. Enter your one-time password code to confirm email or phone and continue securely.',
    url: 'https://forbusiness.collbine.com/verify',
    siteName: 'Collbine for Business',
    images: [
      {
        url: 'https://forbusiness.collbine.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'OTP Verification | Collbine for Business',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OTP Verification | Collbine for Business',
    description:
      'Finish OTP verification to access your Collbine for Business account. Enter your one-time password code to confirm email or phone and continue securely.',
    images: ['https://forbusiness.collbine.com/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://forbusiness.collbine.com/verify' },
};

const Page = () => {
    return <Verify/>
};

export default Page;