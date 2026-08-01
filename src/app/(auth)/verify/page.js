import Verify from './Verify';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'OTP Verification | HomeFood for Business',
  description:
    'Finish OTP verification to access your HomeFood for Business account. Enter your one-time password code to confirm email or phone and continue securely.',
  keywords: [
    'OTP verification',
    'one-time password',
    'verify OTP',
    'email verification',
    'phone verification',
    'HomeFood for Business',
    'secure account access',
  ],
  openGraph: {
    title: 'OTP Verification | HomeFood for Business',
    description:
      'Finish OTP verification to access your HomeFood for Business account. Enter your one-time password code to confirm email or phone and continue securely.',
    url: 'https://business.homefood.sg/verify',
    siteName: 'HomeFood for Business',
    images: [
      {
        url: 'https://business.homefood.sg/og-image.png',
        width: 1200,
        height: 630,
        alt: 'OTP Verification | HomeFood for Business',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OTP Verification | HomeFood for Business',
    description:
      'Finish OTP verification to access your HomeFood for Business account. Enter your one-time password code to confirm email or phone and continue securely.',
    images: ['https://business.homefood.sg/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://business.homefood.sg/verify' },
};

const Page = () => {
    return <Verify/>
};

export default Page;