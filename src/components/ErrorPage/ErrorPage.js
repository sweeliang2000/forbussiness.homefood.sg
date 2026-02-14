'use client';
import Image from 'next/image';
import styles from './ErrorPage.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { Button } from '@mui/material';
import { EMAIL_CONTACT_ADDRESS } from '@/utility/constantString';
import { SIGN_OUT } from '@/utility/apiPaths';
import apiClient from '@/utility/api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const getTitleAndMessage = (statusCode, message) => {
  if (statusCode === 403) {
    return {
      title: 'Unauthorised',
      defaultBody: "You don't have permission to view this page. Please re-login or contact your administrator if you believe this is an error."
    };
  }
  if (statusCode === 401) {
    return {
      title: 'Session expired',
      defaultBody: 'Your session may have expired. Please sign in again to continue.'
    };
  }
  return {
    title: 'An error had occured',
    defaultBody: 'Please wait a moment and try again, or re-login to continue.'
  };
};

const ErrorPage = ({
  message,
  statusCode
}) => {
  const router = useRouter();
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const { title, defaultBody } = getTitleAndMessage(statusCode, message);

  const reLoginHandler = async (event) => {
    event.preventDefault();
    setIsButtonLoading(true);
    try {
      await apiClient.post(SIGN_OUT);
      router.replace('/login');
    } catch (error) {
      console.error('Re-login sign out error:', error);
      setIsButtonLoading(false);
      // Still redirect to login so user can re-authenticate
      router.replace('/login');
    }
  };

  return (
    <ContentCard className={styles.body}>
      <div className={styles.content}>
        <Image
          src='/images/common/alert_undraw.svg'
          height={480}
          width={480}
          className={styles.alertImage}
          alt='Alert error'
        />

        <div className={styles.contentInfo}>
          <h1>{title}</h1>

          <p className={styles.genericMessage}>
            {message && <>{message} <br /></>}
            {defaultBody}
            {!statusCode && (
              <>
                <br />
                If the issue persists, contact us at <a href={`mailto:${EMAIL_CONTACT_ADDRESS}`}>{EMAIL_CONTACT_ADDRESS}</a> for assistance.
              </>
            )}
          </p>

          <Button
            type='submit'
            variant='contained'
            color='primary'
            fullWidth
            onClick={reLoginHandler}
            loading={isButtonLoading}
            className={styles.refreshButton}
          >
            Re-login
          </Button>
        </div>
      </div>
    </ContentCard>
  )
};

export default ErrorPage;