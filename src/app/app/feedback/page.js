'use client';
import styles from './page.module.css';
import GoogleForm from '@/components/GoogleForm/GoogleForm';

const FeedbackPage = () => {
  // You can get the email from your authentication system or pass it as needed
  const userEmail = "user@example.com"; // Replace this with actual user email

  return (
    <div className={styles.container}>
      <GoogleForm email={userEmail} />
    </div>
  );
};

export default FeedbackPage;