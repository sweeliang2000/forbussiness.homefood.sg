import type { Metadata } from 'next'

import ForgotPassword from './forgot-password'

export const metadata: Metadata = {
  title: 'Reset Your Password | Collbine For Business',
  description:
    'Forgot password? Verify with an OTP, then securely reset your Collbine For Business password for Singapore merchants with easy account recovery.',
  keywords: [
    'forgot password',
    'OTP verification',
    'reset password',
    'Collbine For Business',
    'business account recovery',
    'Singapore merchants',
    'loyalty program login',
  ],
  openGraph: {
    title: 'Reset Your Password | Collbine For Business',
    description:
      'Forgot password? Verify with an OTP, then securely reset your Collbine For Business password for Singapore merchants with easy account recovery.',
    url: 'https://forbusiness.collbine.com/forgot-password',
    siteName: 'Collbine For Business',
    images: [
      {
        url: 'https://forbusiness.collbine.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Reset Your Password',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reset Your Password | Collbine For Business',
    description:
      'Forgot password? Verify with an OTP, then securely reset your Collbine For Business password for Singapore merchants with easy account recovery.',
    images: ['https://forbusiness.collbine.com/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://forbusiness.collbine.com/forgot-password',
  },
}

const Page = () => {
  return <ForgotPassword />
}

export default Page

