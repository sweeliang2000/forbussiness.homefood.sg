import type { Metadata } from 'next'

import ForgotPassword from './forgot-password'

export const metadata: Metadata = {
  title: 'Reset Your Password | HomeFood For Business',
  description:
    'Forgot password? Verify with an OTP, then securely reset your HomeFood For Business password for Singapore merchants with easy account recovery.',
  keywords: [
    'forgot password',
    'OTP verification',
    'reset password',
    'HomeFood For Business',
    'business account recovery',
    'Singapore merchants',
    'loyalty program login',
  ],
  openGraph: {
    title: 'Reset Your Password | HomeFood For Business',
    description:
      'Forgot password? Verify with an OTP, then securely reset your HomeFood For Business password for Singapore merchants with easy account recovery.',
    url: 'https://business.homefood.sg/forgot-password',
    siteName: 'HomeFood For Business',
    images: [
      {
        url: 'https://business.homefood.sg/og-image.png',
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
    title: 'Reset Your Password | HomeFood For Business',
    description:
      'Forgot password? Verify with an OTP, then securely reset your HomeFood For Business password for Singapore merchants with easy account recovery.',
    images: ['https://business.homefood.sg/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://business.homefood.sg/forgot-password',
  },
}

const Page = () => {
  return <ForgotPassword />
}

export default Page

