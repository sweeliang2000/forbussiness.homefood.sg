'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';

import apiClient from '@/utility/api';
import { CREATE_PORTAL_SESSION } from '@/utility/apiPaths';
import { setSubscriptionLookupKey } from '@/utility/subscriptionStorage';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import styles from './page.module.css';

export default function SuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState('verifying');
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setState('failed');
      return;
    }

    apiClient.get('/api/subscription/checkout-status', { params: { session_id: sessionId } })
      .then((response) => {
        const data = response.data?.data;
        if (data?.checkout_status === 'complete' && data?.entitled) {
          apiClient.get('/api/data/shopSubscriptionStatus').then((statusResponse) => {
            setSubscriptionLookupKey(statusResponse.data?.data?.lookup_key || null);
          }).catch(() => {});
          setState('success');
        } else {
          setState('pending');
        }
      })
      .catch(() => setState('failed'));
  }, [searchParams]);

  const handleManageBilling = async () => {
    if (portalLoading) return;
    setPortalLoading(true);
    try {
      const response = await apiClient.post(CREATE_PORTAL_SESSION);
      const url = response.data?.data?.url;
      if (url) window.location.assign(url);
      else setPortalLoading(false);
    } catch {
      setPortalLoading(false);
      setState('failed');
    }
  };

  const successful = state === 'success';
  const waiting = state === 'verifying';

  return (
    <div className={styles.container}>
      <section className={styles.successSection}>
        <ContentCard className={styles.successBox}>
          <h1 className={styles.successTitle}>
            {waiting ? 'VERIFYING SUBSCRIPTION' : successful ? 'SUBSCRIPTION ACTIVE' : 'SUBSCRIPTION NOT CONFIRMED'}
          </h1>
          <p className={styles.successDescription}>
            {waiting
              ? 'We are securely confirming the Checkout Session with Stripe.'
              : successful
                ? 'Stripe confirmed your subscription. Your Pro benefits are now active.'
                : state === 'pending'
                  ? 'Checkout completed, but the subscription is not active yet. Check the Billing Portal for payment details.'
                  : 'We could not verify this Checkout Session. Return to subscriptions or contact support.'}
          </p>

          <div className={styles.successIcon}>
            {waiting ? <CircularProgress size={72} /> : successful ? (
              <CheckCircleIcon sx={{ fontSize: 100, color: '#2DD4BF' }} />
            ) : (
              <ErrorOutlineIcon sx={{ fontSize: 92, color: '#B42318' }} />
            )}
          </div>

          <div className={styles.buttonContainer}>
            <Button variant="outlined" size="large" onClick={() => router.push('/app/subscription')} startIcon={<KeyboardBackspaceIcon />}>
              Back to subscriptions
            </Button>
            {!waiting ? (
              <Button variant="contained" size="large" onClick={handleManageBilling} disabled={portalLoading}>
                {portalLoading ? 'Opening…' : 'Manage billing securely'}
              </Button>
            ) : null}
          </div>
        </ContentCard>
      </section>
    </div>
  );
}
