import type { Metadata } from 'next';
import styles from './page.module.css';
import GoogleForm from '@/components/GoogleForm/GoogleForm';
import { FaWhatsapp } from 'react-icons/fa';

export const metadata: Metadata = {
  title: 'Feedback | Collbine for Business',
  description:
    'Send feedback, feature requests, or report issues to Collbine for Business. Help us improve the loyalty and rewards tools for Singapore businesses.',
  keywords: [
    'Collbine for Business',
    'feedback',
    'feature requests',
    'report an issue',
    'loyalty platform',
    'rewards',
    'Singapore',
  ],
  openGraph: {
    title: 'Feedback | Collbine for Business',
    description:
      'Send feedback, feature requests, or report issues to Collbine for Business. Help us improve the loyalty and rewards tools for Singapore businesses.',
    url: 'https://forbusiness.collbine.com/app/feedback',
    siteName: 'Collbine for Business',
    images: [
      {
        url: 'https://forbusiness.collbine.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Collbine for Business Feedback',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Feedback | Collbine for Business',
    description:
      'Send feedback, feature requests, or report issues to Collbine for Business. Help us improve the loyalty and rewards tools for Singapore businesses.',
    images: ['https://forbusiness.collbine.com/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://forbusiness.collbine.com/app/feedback' },
};

const WHATSAPP_URL =
  'https://api.whatsapp.com/send/?phone=6588678978&text&type=phone_number&app_absent=0';

const FeedbackPage = () => {
  // You can get the email from your authentication system or pass it as needed
  const userEmail = 'user@example.com'; // Replace this with actual user email

  return (
    <div className={styles.container}>
      <GoogleForm email={userEmail} />
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.whatsappFloating}
        aria-label="Contact us on WhatsApp"
      >
        <FaWhatsapp className={styles.whatsappFloatingIcon} />
      </a>
    </div>
  );
};

export default FeedbackPage;
