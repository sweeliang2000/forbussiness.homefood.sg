import LandingNavbar from '@/components/LandingNavbar/LandingNavbar';
import { FaWhatsapp } from 'react-icons/fa';
import styles from './layout.module.css';

const WHATSAPP_URL =
  'https://api.whatsapp.com/send/?phone=6588678978&text&type=phone_number&app_absent=0';

export const metadata = {
  title: 'Collbine for Business | Customisable Loyalty Systems in Singapore',
  description: 'Collbine offers a loyalty system for Singapore merchants. Empower your business with a unique, flexible rewards program that allows customers to earn and redeem points, tailored to your shop\'s needs.',
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
