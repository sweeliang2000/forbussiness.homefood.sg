'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { Button, CircularProgress } from '@mui/material';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import ErrorPage from '@/components/ErrorPage/ErrorPage';
import apiClient from '@/utility/api';
import Link from 'next/link';
import {
  STRIPE_CONNECT_ACCOUNT_STATUS,
  STRIPE_CONNECT_CREATE_ACCOUNT,
  STRIPE_CONNECT_CREATE_ACCOUNT_LINK,
  STRIPE_CONNECT_DASHBOARD_LINK,
} from '@/utility/apiPaths';

export default function PaymentsSetupPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingErrorMessage, setLoadingErrorMessage] = useState(null);
  const [loadingErrorStatus, setLoadingErrorStatus] = useState(null);

  const [status, setStatus] = useState(null);
  const [isEdit, setIsEdit] = useState(true);
  const [releaseStatus, setReleaseStatus] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await apiClient.get(STRIPE_CONNECT_ACCOUNT_STATUS);
        const data = res.data?.data ?? res.data;
        setStatus(data);
        if (data?.isEdit !== undefined) setIsEdit(data.isEdit);
        if (data?.releaseStatus !== undefined) setReleaseStatus(data.releaseStatus);
      } catch (error) {
        const message = error?.response?.data?.message || error.message;
        const code = error?.response?.data?.code || error.code;
        const statusCode = error?.response?.status;
        setLoadingErrorMessage(`An error had occurred. ${message} (Error code: ${code})`);
        setLoadingErrorStatus(statusCode ?? null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleConnect = async () => {
    setActionLoading(true);
    setIsError(false);
    try {
      await apiClient.post(STRIPE_CONNECT_CREATE_ACCOUNT);
      const linkRes = await apiClient.post(STRIPE_CONNECT_CREATE_ACCOUNT_LINK);
      const url = linkRes.data?.data?.url ?? linkRes.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        setActionLoading(false);
      }
    } catch (error) {
      const message = error?.response?.data?.message || error.message;
      setIsError(true);
      setErrorMessage(`Failed to start onboarding. ${message}`);
      setActionLoading(false);
    }
  };

  const handleViewDashboard = async () => {
    setActionLoading(true);
    setIsError(false);
    try {
      const res = await apiClient.get(STRIPE_CONNECT_DASHBOARD_LINK);
      const url = res.data?.data?.url ?? res.data?.url;
      if (url) window.open(url, '_blank');
    } catch (error) {
      const message = error?.response?.data?.message || error.message;
      setIsError(true);
      setErrorMessage(`Failed to retrieve dashboard link. ${message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleContinueOnboarding = async () => {
    setActionLoading(true);
    setIsError(false);
    try {
      const linkRes = await apiClient.post(STRIPE_CONNECT_CREATE_ACCOUNT_LINK);
      const url = linkRes.data?.data?.url ?? linkRes.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        setActionLoading(false);
      }
    } catch (error) {
      const message = error?.response?.data?.message || error.message;
      setIsError(true);
      setErrorMessage(`Failed to retrieve onboarding link. ${message}`);
      setActionLoading(false);
    }
  };

  const isApprovedScheduled = releaseStatus === 'approved_scheduled';

  return (
    <div className={styles.root}>
      <HeaderSection
        className={styles.header}
        title="Payments Setup"
        description={<p>Configure your payout settings and payment preferences.</p>}
        showButton={false}
        isError={isError}
        setShowError={setIsError}
        errorMessage={errorMessage}
        isSuccess={isApprovedScheduled}
        successMessage={
          !isEdit && isApprovedScheduled
            ? (
              <>
                Your release has been approved. It will be released on the date you stated on{' '}
                <Link href="/app/release/submission">Release Submission Page</Link>.
                {' '}If you wish to change the date, cancel and re-send for approval. For any enquiry or urgent release, please email support@collbine.com.
              </>
            )
            : null
        }
        infoMessage={
          !isEdit && !isApprovedScheduled
            ? 'The information has been submitted for release and is currently under review. To make any changes, please cancel it under Release Submission.'
            : null
        }
      />

      {isLoading ? (
        <LoadingPage />
      ) : loadingErrorMessage !== null ? (
        <ErrorPage message={loadingErrorMessage} statusCode={loadingErrorStatus} />
      ) : !status?.connected ? (
        // State 1 — Not connected
        <ContentCard className={styles.content}>
          <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>Set Up Payouts</p>
          <p style={{ color: 'rgba(0,0,0,0.6)', margin: 0, fontSize: 14 }}>
            Complete payout setup to receive payments from orders placed through Collbine.
            You&apos;ll be guided through the onboarding steps to get started.
          </p>
          <div>
            <Button
              variant="contained"
              size="small"
              style={{ textTransform: 'none' }}
              onClick={handleConnect}
              disabled={actionLoading || !isEdit}
              startIcon={actionLoading ? <CircularProgress size={14} color="inherit" /> : null}
            >
              Start Onboarding
            </Button>
          </div>
        </ContentCard>
      ) : !status?.detailsSubmitted ? (
        // State 2 — Connected but incomplete
        <ContentCard className={styles.content}>
          <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>Set Up Payouts</p>
          <p style={{ color: 'rgba(0,0,0,0.6)', margin: 0, fontSize: 14 }}>
            Complete payout setup to receive payments from orders placed through Collbine.
            You&apos;ll be guided through the onboarding steps to get started.
          </p>
          <div>
            <Button
              variant="contained"
              size="small"
              style={{ textTransform: 'none' }}
              onClick={handleContinueOnboarding}
              disabled={actionLoading || !isEdit}
              startIcon={actionLoading ? <CircularProgress size={14} color="inherit" /> : null}
            >
              Continue Onboarding
            </Button>
          </div>
        </ContentCard>
      ) : (
        // State 3 — Fully onboarded
        <ContentCard className={styles.content}>
          <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>Payouts Connected</p>
          <p style={{ color: 'rgba(0,0,0,0.6)', margin: 0, fontSize: 14 }}>
            Your payout account is active. Visit the dashboard to manage your account details and payout settings.
          </p>
          <div>
            <Button
              variant="contained"
              size="small"
              style={{ textTransform: 'none' }}
              onClick={handleViewDashboard}
              disabled={actionLoading}
              startIcon={actionLoading ? <CircularProgress size={14} color="inherit" /> : null}
            >
              View Dashboard
            </Button>
          </div>
        </ContentCard>
      )}
    </div>
  );
}
