import LandingNavbar from '@/components/LandingNavbar/LandingNavbar';
import { FaWhatsapp } from 'react-icons/fa';
import styles from './layout.module.css';

const WHATSAPP_URL =
  'https://api.whatsapp.com/send/?phone=6588678978&text&type=phone_number&app_absent=0';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Scan-to-Win Loyalty for Merchants | Collbine for Business',
  description:
    'Boost Singapore customer visits with scan-to-win loyalty for merchants. Collbine helps run QR rewards and redeem points in one simple system.',
  keywords: [
    'scan-to-win loyalty',
    'QR scan to win',
    'loyalty program Singapore',
    'merchant rewards',
    'customer retention',
    'digital loyalty card',
    'Singapore QR loyalty',
    'reward redemption',
  ],
  openGraph: {
    title: 'Scan-to-Win Loyalty for Merchants | Collbine for Business',
    description:
      'Boost Singapore customer visits with scan-to-win loyalty for merchants. Collbine helps run QR rewards and redeem points in one simple system.',
    url: 'https://forbusiness.collbine.com/',
    siteName: 'Collbine for Business',
    images: [
      {
        url: 'https://forbusiness.collbine.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Scan-to-Win Loyalty for Merchants',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scan-to-Win Loyalty for Merchants | Collbine for Business',
    description:
      'Boost Singapore customer visits with scan-to-win loyalty for merchants. Collbine helps run QR rewards and redeem points in one simple system.',
    images: ['https://forbusiness.collbine.com/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://forbusiness.collbine.com/' },
};

export default function RootLayout({ children }) {
  return (
    <>
      <LandingNavbar />
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
