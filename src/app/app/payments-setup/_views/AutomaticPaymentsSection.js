'use client';

import { useEffect, useState } from 'react';
import { Switch, Button, CircularProgress, Alert, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { FaCheckCircle } from 'react-icons/fa';
import apiClient from '@/utility/api';
import {
  STRIPE_CONNECT_ACCOUNT_STATUS,
  STRIPE_CONNECT_CREATE_ACCOUNT,
  STRIPE_CONNECT_CREATE_ACCOUNT_LINK,
  STRIPE_CONNECT_DASHBOARD_LINK,
} from '@/utility/apiPaths';
import styles from '../page.module.css';

const ACCEPTED_METHODS = [
  { src: '/images/payments/Paynow.png', alt: 'PayNow' },
  { src: '/images/payments/Credit Card, Apple Pays and Google Pays.png', alt: 'Credit Card, Apple Pay & Google Pay' },
  { src: '/images/payments/GrabPay.png', alt: 'GrabPay' },
  { src: '/images/payments/WeChat Pay.png', alt: 'WeChat Pay' },
  { src: '/images/payments/Alipay Pay.png', alt: 'Alipay' },
];

export default function AutomaticPaymentsSection({ checked, disabled, onToggle, expanded, onToggleExpand }) {
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await apiClient.get(STRIPE_CONNECT_ACCOUNT_STATUS);
        setStatus(res.data?.data ?? res.data);
      } catch {
        // Onboarding status is best-effort; the section still renders.
        setStatus(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleConnect = async () => {
    setActionLoading(true);
    setError('');
    try {
      await apiClient.post(STRIPE_CONNECT_CREATE_ACCOUNT);
      const linkRes = await apiClient.post(STRIPE_CONNECT_CREATE_ACCOUNT_LINK);
      const url = linkRes.data?.data?.url ?? linkRes.data?.url;
      if (url) window.location.href = url;
      else setActionLoading(false);
    } catch (err) {
      setError(`Failed to start onboarding. ${err?.response?.data?.message || err.message}`);
      setActionLoading(false);
    }
  };

  const handleContinueOnboarding = async () => {
    setActionLoading(true);
    setError('');
    try {
      const linkRes = await apiClient.post(STRIPE_CONNECT_CREATE_ACCOUNT_LINK);
      const url = linkRes.data?.data?.url ?? linkRes.data?.url;
      if (url) window.location.href = url;
      else setActionLoading(false);
    } catch (err) {
      setError(`Failed to retrieve onboarding link. ${err?.response?.data?.message || err.message}`);
      setActionLoading(false);
    }
  };

  const handleViewDashboard = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await apiClient.get(STRIPE_CONNECT_DASHBOARD_LINK);
      const url = res.data?.data?.url ?? res.data?.url;
      if (url) window.open(url, '_blank');
    } catch (err) {
      setError(`Failed to retrieve dashboard link. ${err?.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const renderOnboarding = () => {
    if (isLoading) {
      return <CircularProgress size={20} />;
    }

    if (!status?.connected) {
      return (
        <div className={styles.stripeBody}>
          <p className={styles.stripeTitle}>Set Up Payouts</p>
          <p className={styles.stripeDesc}>
            Complete payout setup to accept automatic payments and receive funds from orders placed
            through HomeFood. You&apos;ll be guided through the onboarding steps to get started.
          </p>
          <div>
            <Button
              variant="contained"
              size="small"
              sx={{ textTransform: 'none' }}
              onClick={handleConnect}
              disabled={actionLoading || disabled}
              startIcon={actionLoading ? <CircularProgress size={14} color="inherit" /> : null}
            >
              Start Onboarding
            </Button>
          </div>
        </div>
      );
    }

    if (!status?.detailsSubmitted) {
      return (
        <div className={styles.stripeBody}>
          <p className={styles.stripeTitle}>Set Up Payouts</p>
          <p className={styles.stripeDesc}>
            Your onboarding is incomplete. Finish the remaining steps to start accepting automatic
            payments.
          </p>
          <div>
            <Button
              variant="contained"
              size="small"
              sx={{ textTransform: 'none' }}
              onClick={handleContinueOnboarding}
              disabled={actionLoading || disabled}
              startIcon={actionLoading ? <CircularProgress size={14} color="inherit" /> : null}
            >
              Continue Onboarding
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.stripeBody}>
        <p className={styles.stripeTitle}>Payouts Connected</p>
        <p className={styles.stripeDesc}>
          Your payout account is active. Visit the dashboard to manage your account details and payout
          settings.
        </p>
        <div>
          <Button
            variant="contained"
            size="small"
            sx={{ textTransform: 'none' }}
            onClick={handleViewDashboard}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={14} color="inherit" /> : null}
          >
            View Dashboard
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={onToggleExpand} role="button" tabIndex={0}>
        <Switch
          checked={checked}
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <div className={styles.sectionHeaderText}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>Automatic Payments</span>
            <span className={styles.feeBadge}>3% fee</span>
            {checked && (
              <span className={styles.activePill}>
                <FaCheckCircle size={12} /> Active
              </span>
            )}
          </div>
        </div>
        <ExpandMoreIcon className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`} />
      </div>

      <Collapse in={expanded}>
        <div className={styles.collapseInner}>
          <p className={styles.sectionDesc}>
            Payments are verified automatically by the provider and orders auto-confirm. The platform
            manages refunds. Supports multiple payment methods:
          </p>

          <div className={styles.methodBadges}>
            {ACCEPTED_METHODS.map((m) => (
              <span className={styles.methodBadge} key={m.alt}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={encodeURI(m.src)} alt={m.alt} title={m.alt} />
              </span>
            ))}
          </div>

          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {renderOnboarding()}
        </div>
      </Collapse>
    </div>
  );
}
