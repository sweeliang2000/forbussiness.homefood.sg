'use client';

import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import { ContentCard } from '@/components/ContentCard/ContentCard';

export default function SuccessClient() {
  const router = useRouter();

  const handleBackToSettings = () => {
    router.push('/app/setting');
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating portal session:', error);
    }
  };

  return (
    <div className={styles.container}>
      <section className={styles.successSection}>
        <ContentCard className={styles.successBox}>
          <h1 className={styles.successTitle}>PAYMENT SUCCESSFUL!</h1>
          <p className={styles.successDescription}>
            Click the button below to return to your settings.
          </p>

          <div className={styles.successIcon}>
            <CheckCircleIcon sx={{ fontSize: 100, color: '#2DD4BF' }} />
          </div>

          <div className={styles.buttonContainer}>
            <Button
              variant="outlined"
              size="large"
              onClick={handleBackToSettings}
              startIcon={<KeyboardBackspaceIcon />}
              sx={{
                borderRadius: '9999px',
                padding: '10px 24px',
                borderColor: '#E4550D',
                color: '#E4550D',
                '&:hover': {
                  borderColor: '#C2410C',
                  backgroundColor: 'transparent',
                  color: '#C2410C',
                },
              }}
            >
              Back to setting
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={handleManageBilling}
              sx={{
                backgroundColor: '#E4550D',
                '&:hover': {
                  backgroundColor: '#C2410C',
                },
                borderRadius: '9999px',
                padding: '10px 24px',
              }}
            >
              Manage your billing
            </Button>
          </div>
        </ContentCard>
      </section>
    </div>
  );
}

