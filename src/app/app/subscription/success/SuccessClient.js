'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, CircularProgress } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import KeyboardBackspaceRoundedIcon from '@mui/icons-material/KeyboardBackspaceRounded';

import apiClient from '@/utility/api';
import { CREATE_PORTAL_SESSION } from '@/utility/apiPaths';
import { setSubscriptionLookupKey } from '@/utility/subscriptionStorage';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import styles from './page.module.css';

/**
 * Copy and tone per state, kept as data rather than nested ternaries so the
 * four outcomes can be read side by side. `pending` is deliberately its own
 * tone: checkout succeeded, so showing the error treatment would tell a
 * merchant their payment failed when it hasn't.
 */
const VIEWS = {
  verifying: {
    tone: 'pending',
    title: 'Confirming your subscription',
    body: 'We’re checking the payment with Stripe. This usually takes a moment.',
  },
  success: {
    tone: 'success',
    title: 'You’re on Pro',
    body: 'Stripe confirmed the payment. Your Pro features are active right now.',
  },
  pending: {
    tone: 'pending',
    title: 'Payment still processing',
    body: 'Checkout went through, but Stripe hasn’t confirmed the subscription yet. The billing portal has the payment details.',
  },
  failed: {
    tone: 'failed',
    title: 'We couldn’t confirm this',
    body: 'This checkout session couldn’t be verified. Head back to subscriptions, or contact support if you were charged.',
  },
};

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

  const waiting = state === 'verifying';
  const view = VIEWS[state] ?? VIEWS.failed;

  return (
    <div className={styles.container}>
      <section className={styles.cardWrap}>
        <ContentCard className={styles.card}>
          {/* Keyed on state so the resolved content mounts fresh and replays
              its entrance — the swap out of `verifying` is the one moment
              this page visibly stutters. */}
          <div className={styles.result} key={state}>
            <div
              className={`${styles.medallion} ${styles[view.tone]}`}
              role="img"
              aria-label={view.title}
            >
              {waiting ? (
                <CircularProgress size={34} thickness={4} color="inherit" />
              ) : state === 'success' ? (
                <CheckCircleRoundedIcon className={styles.glyph} />
              ) : state === 'pending' ? (
                <ScheduleRoundedIcon className={styles.glyph} />
              ) : (
                <ErrorOutlineRoundedIcon className={styles.glyph} />
              )}
            </div>

            <h1 className={styles.title}>{view.title}</h1>
            <p className={styles.body}>{view.body}</p>

            <div className={styles.actions}>
              <Button
                className={styles.action}
                variant="outlined"
                size="large"
                onClick={() => router.push('/app/subscription')}
                startIcon={<KeyboardBackspaceRoundedIcon />}
              >
                Back to subscriptions
              </Button>
              {!waiting ? (
                <Button
                  className={styles.action}
                  variant="contained"
                  size="large"
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                >
                  {/* Keyed so the label cross-fades instead of teleporting;
                      the button keeps its width so nothing reflows. */}
                  <span className={styles.actionLabel} key={portalLoading ? 'busy' : 'idle'}>
                    {portalLoading ? 'Opening…' : 'Manage billing'}
                  </span>
                </Button>
              ) : null}
            </div>
          </div>
        </ContentCard>
      </section>
    </div>
  );
}
