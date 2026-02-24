'use client';
import styles from './page.module.css';
import GoogleForm from '@/components/GoogleForm/GoogleForm';
import { FaWhatsapp } from 'react-icons/fa';

const WHATSAPP_URL = 'https://api.whatsapp.com/send/?phone=6588678978&text&type=phone_number&app_absent=0';

const FeedbackPage = () => {
  // You can get the email from your authentication system or pass it as needed
  const userEmail = "user@example.com"; // Replace this with actual user email

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