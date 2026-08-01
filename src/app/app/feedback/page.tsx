import type { Metadata } from 'next';
import styles from './page.module.css';
import FeedbackClient from './FeedbackClient';
import { FaWhatsapp } from 'react-icons/fa';

export const metadata: Metadata = {
  title: 'Feedback | HomeFood for Business',
  description:
    'Send feedback, feature requests, or report issues to HomeFood for Business. Help us improve the loyalty and rewards tools for Singapore businesses.',
  keywords: [
    'HomeFood for Business',
    'feedback',
    'feature requests',
    'report an issue',
    'loyalty platform',
    'rewards',
    'Singapore',
  ],
  openGraph: {
    title: 'Feedback | HomeFood for Business',
    description:
      'Send feedback, feature requests, or report issues to HomeFood for Business. Help us improve the loyalty and rewards tools for Singapore businesses.',
    url: 'https://business.homefood.sg/app/feedback',
    siteName: 'HomeFood for Business',
    images: [
      {
        url: 'https://business.homefood.sg/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HomeFood for Business Feedback',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Feedback | HomeFood for Business',
    description:
      'Send feedback, feature requests, or report issues to HomeFood for Business. Help us improve the loyalty and rewards tools for Singapore businesses.',
    images: ['https://business.homefood.sg/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://business.homefood.sg/app/feedback' },
};

const WHATSAPP_URL =
  'https://api.whatsapp.com/send/?phone=6588678978&text&type=phone_number&app_absent=0';

const FeedbackPage = () => {
  return (
    <div className={styles.container}>
      <FeedbackClient />
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
