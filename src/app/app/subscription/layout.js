import { FaWhatsapp } from 'react-icons/fa';
import styles from './layout.module.css';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Subscription & Promo Codes | Collbine',
  description:
    'Manage your Collbine business subscription and redeem promo codes in seconds. Pick a plan, apply your code, and access premium features today.',
  keywords: [
    'Collbine subscription',
    'promo codes',
    'business subscription',
    'subscription plans',
    'billing and payments',
    'apply promo code',
    'premium features',
    'Collbine for Business',
  ],
  openGraph: {
    title: 'Subscription & Promo Codes | Collbine',
    description:
      'Manage your Collbine business subscription and redeem promo codes in seconds. Pick a plan, apply your code, and access premium features today.',
    url: 'https://forbusiness.collbine.com/app/subscription',
    siteName: 'Collbine',
    images: [
      {
        url: 'https://forbusiness.collbine.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Collbine subscription & promo codes',
      },
    ],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Subscription & Promo Codes | Collbine',
    description:
      'Manage your Collbine business subscription and redeem promo codes in seconds. Pick a plan, apply your code, and access premium features today.',
    images: ['https://forbusiness.collbine.com/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://forbusiness.collbine.com/app/subscription',
  },
};

const WHATSAPP_URL =
  'https://api.whatsapp.com/send/?phone=6588678978&text&type=phone_number&app_absent=0';

export default function SubscriptionLayout({ children }) {
  return (
    <>
      {children}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.whatsappFloating}
        aria-label="Contact us on WhatsApp"
      >
        <FaWhatsapp className={styles.whatsappFloatingIcon} />
      </a>
    </>
  );
}

