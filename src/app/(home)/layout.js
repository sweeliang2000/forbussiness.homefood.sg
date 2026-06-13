import LandingNavbar from '@/components/LandingNavbar/LandingNavbar';
import LandingFooter from '@/components/LandingFooter/LandingFooter';
import { FaWhatsapp } from 'react-icons/fa';
import styles from './layout.module.css';

const WHATSAPP_URL =
  'https://api.whatsapp.com/send/?phone=6588678978&text&type=phone_number&app_absent=0';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Grow Your Home Kitchen Business | Collbine for Business',
  description:
    'Collbine helps home-based food sellers in Singapore get discovered, take pre-orders, accept online payments, and manage home pickup — all in one place.',
  keywords: [
    'home based food Singapore',
    'HBF seller platform',
    'home kitchen pre-order',
    'home food pickup Singapore',
    'online payment home business',
    'Collbine for business',
    'home food order app',
    'Singapore home food seller',
  ],
  openGraph: {
    title: 'Grow Your Home Kitchen Business | Collbine for Business',
    description:
      'Collbine helps home-based food sellers in Singapore get discovered, take pre-orders, accept online payments, and manage home pickup — all in one place.',
    url: 'https://forbusiness.collbine.com/',
    siteName: 'Collbine for Business',
    images: [
      {
        url: 'https://forbusiness.collbine.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Grow Your Home Kitchen Business with Collbine',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grow Your Home Kitchen Business | Collbine for Business',
    description:
      'Collbine helps home-based food sellers in Singapore get discovered, take pre-orders, accept online payments, and manage home pickup — all in one place.',
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
      <LandingFooter />
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
