'use client';

import { useRouter } from 'next/navigation';
import styles from './Message.module.css';
import Button from '@mui/material/Button';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import { ContentCard } from '@/components/ContentCard/ContentCard';

export default function Message({ message }) {
  const router = useRouter();

  const handleBackToSettings = () => {
    router.push('/app/setting');
  };

  const handleUpgrade = () => {
    router.push('/app/subscription');
  };

  return (
    <div className={styles.container}>
      <section className={styles.messageSection}>
        <ContentCard className={styles.messageBox}>
          <h1 className={styles.messageTitle}>Subscription Failed</h1>
          <p className={styles.messageText}>{message}</p>
          
          <div className={styles.buttonContainer}>
            <Button 
              variant="outlined"
              size="large"
              onClick={handleBackToSettings}
              startIcon={<KeyboardBackspaceIcon />}
              sx={{
                borderRadius: '9999px',
                padding: '10px 24px',
                borderColor: '#4F46E5',
                color: '#4F46E5',
                '&:hover': {
                  borderColor: '#4338CA',
                  backgroundColor: 'transparent',
                  color: '#4338CA',
                }
              }}
            >
              Back to setting
            </Button>
            <Button 
              variant="contained"
              size="large"
              onClick={handleUpgrade}
              sx={{
                backgroundColor: '#4F46E5',
                '&:hover': {
                  backgroundColor: '#4338CA',
                },
                borderRadius: '9999px',
                padding: '10px 24px'
              }}
            >
              Upgrade
            </Button>
          </div>
        </ContentCard>
      </section>
    </div>
  );
} 