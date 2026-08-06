'use client';

import { useEffect, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { FaCheck } from 'react-icons/fa';

import apiClient from '@/utility/api';
import { CREATE_PORTAL_SESSION, SHOP_SUBSCRIPTION_STATUS } from '@/utility/apiPaths';
import styles from './ManageSubscription.module.css';

const PLAN_LABELS = {
  free: 'Free',
  pro_monthly: 'Pro — monthly',
  pro_yearly: 'Pro — yearly',
};

export default function PlanAndUpgradeContent() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.get(SHOP_SUBSCRIPTION_STATUS)
      .then((response) => setSubscription(response.data?.data || null))
      .catch(() => setError('We could not load your subscription right now.'))
      .finally(() => setLoading(false));
  }, []);

  const openPortal = async () => {
    if (portalLoading) return;
    setPortalLoading(true);
    setError(null);
    try {
      const response = await apiClient.post(CREATE_PORTAL_SESSION);
      const url = response.data?.data?.url;
      if (!url) throw new Error('Missing portal URL');
      window.location.assign(url);
    } catch {
      setError('The billing portal could not be opened. Please try again.');
      setPortalLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.upgradeStatusCenter}><CircularProgress size={32} /></div>;
  }

  const plan = subscription?.plan || 'free';
  const isFree = plan === 'free';

  return (
    <div className={styles.planAndUpgradeWrapper}>
      <section className={styles.contentSection}>
        <p className={styles.sectionLabel}>Current plan</p>
        <div className={styles.currentPlanCard}>
          <div className={styles.currentPlanHeader}>
            <div className={styles.currentPlanInfo}>
              <h3>{PLAN_LABELS[plan] || 'Free'}</h3>
              <p className={styles.planDescription}>
                {isFree
                  ? 'No platform subscription. Upgrade to Pro to unlock lower fees and Manual PayNow.'
                  : `Stripe status: ${subscription?.status || 'processing'}`}
              </p>
              {subscription?.cancel_at_period_end ? (
                <p className={styles.planPrice}>Cancellation is scheduled for the end of this billing period.</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.contentSection}>
        <p className={styles.sectionLabel}>{isFree ? 'Upgrade' : 'Manage billing'}</p>
        <div className={styles.infoCard}>
          <FaCheck className={styles.checkIcon} aria-hidden="true" />
          <p>
            {isFree
              ? 'Choose monthly or yearly Pro on the subscription page. No card data is handled by HomeFood.'
              : 'Stripe’s secure Billing Portal handles plan changes, payment methods, invoices and cancellation.'}
          </p>
          {isFree ? (
            <a className={styles.upgradeButton} href="/app/subscription">View Pro plans</a>
          ) : (
            <button className={styles.upgradeButton} type="button" onClick={openPortal} disabled={portalLoading}>
              {portalLoading ? 'Opening Stripe…' : 'Open secure billing portal'}
            </button>
          )}
        </div>
        {error ? <p className={styles.upgradeErrorBanner}>{error}</p> : null}
      </section>
    </div>
  );
}
