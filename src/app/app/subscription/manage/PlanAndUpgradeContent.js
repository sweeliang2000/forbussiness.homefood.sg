'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress } from '@mui/material';
import { IoCloseSharp } from 'react-icons/io5';
import styles from './ManageSubscription.module.css';
import { getSubscriptionLookupKey } from '@/utility/subscriptionStorage';
import { SUBSCRIPTION_DATA } from '../data/SUBSCRIPTION_DATA';
import apiClient, { getShopSubscriptionStatus } from '@/utility/api';
import { UPGRADE_SUBSCRIPTION, UPGRADE_STATUS, PREVIEW_UPGRADE_SUBSCRIPTION, DOWNGRADE_SUBSCRIPTION, CANCEL_SCHEDULE, REFRESH_USER_COOKIE, CREATE_PORTAL_SESSION, SUBSCRIPTION_END_DATE } from '@/utility/apiPaths';
import { setSubscriptionLookupKey } from '@/utility/subscriptionStorage';
import { FaChevronDown, FaCheck } from 'react-icons/fa';
import DialogPopup from '@/components/DialogPopup/DialogPopup';


function BenefitsList({ features, className }) {
  if (!features?.length) return null;
  return (
    <ul className={className ?? styles.benefitsList}>
      {features.map((f, i) => (
        <li key={i}>
          {f.included ? (
            <FaCheck className={styles.checkIcon} size={14} />
          ) : (
            <span style={{ width: 14, height: 14, opacity: 0.5 }}>—</span>
          )}
          <span>{f.name}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PlanAndUpgradeContent({ mode = 'upgrade' }) {
  const isDowngrade = mode === 'downgrade';
  const [currentLookupKey, setCurrentLookupKey] = useState(null);
  const [upgradeLoading, setUpgradeLoading] = useState(null);
  const [billingInterval, setBillingInterval] = useState('year'); // 'month' | 'year'
  const [benefitsPopup, setBenefitsPopup] = useState(null); // { planName, features } or null
  const [upgradePreview, setUpgradePreview] = useState(null); // { planName, lookupKey, data } or null
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [upgradeStatus, setUpgradeStatus] = useState(null); // null | 'processing' | 'paid' | 'failed' | 'timeout'
  const [cancelDate, setCancelDate] = useState(null); // formatted date string or null
  const [downgradeDate, setDowngradeDate] = useState(null); // formatted date string or null
  const [downgradePreview, setDowngradePreview] = useState(null); // { planName, lookupKey, price, interval } or null
  const [downgradeConfirmText, setDowngradeConfirmText] = useState('');
  const [downgradeLoading, setDowngradeLoading] = useState(false);
  const [downgradeResult, setDowngradeResult] = useState(null); // { effectiveDate } or null
  const [cancelScheduleLoading, setCancelScheduleLoading] = useState(false);

  useEffect(() => {
    const key = getSubscriptionLookupKey();
    setCurrentLookupKey(key);

    const fetchEndDate = async () => {
      try {
        const res = await apiClient.get(SUBSCRIPTION_END_DATE);
        const data = res.data?.data;
        const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        if (data?.cancel_at_period_end && data?.service_ends_at_formatted) {
          setCancelDate(formatDate(data.service_ends_at_formatted));
        }
        if (data?.scheduled_downgrade_effective_at_formatted) {
          setDowngradeDate(formatDate(data.scheduled_downgrade_effective_at_formatted));
        }
      } catch {
        // Silently ignore — banners just won't show
      }
    };
    fetchEndDate();
  }, []);

  const currentPlan = useMemo(() => {
    if (!currentLookupKey) return null;
    return SUBSCRIPTION_DATA.find((p) => p.lookup_key === currentLookupKey) || null;
  }, [currentLookupKey]);

  const currentPrice = currentPlan?.price ?? 0;

  const visiblePlans = useMemo(() => {
    const isYearly = billingInterval === 'year';
    const baseKeys = ['1_outlets', '2-3_outlets', '4-6_outlets'];

    return baseKeys
      .map((baseKey) => {
        const lookupKey = isYearly ? `${baseKey}_yearly` : baseKey;
        const plan = SUBSCRIPTION_DATA.find((p) => p.lookup_key === lookupKey);
        if (!plan) return null;
        if (currentLookupKey && plan.lookup_key === currentLookupKey) return null;

        if (isDowngrade) {
          if (plan.price >= currentPrice) return null;
        } else {
          if (plan.price <= currentPrice) return null;
        }

        return plan;
      })
      .filter(Boolean);
  }, [billingInterval, currentLookupKey, currentPrice, isDowngrade]);

  const handleUpgrade = async (lookupKey, planName, interval) => {
    if (upgradeLoading) return;
    setUpgradeLoading(lookupKey);
    try {
      const response = await apiClient.post(PREVIEW_UPGRADE_SUBSCRIPTION, { lookup_key: lookupKey });
      const previewData = response.data?.data;
      if (previewData) {
        setUpgradePreview({ planName, lookupKey, interval, data: previewData });
      }
    } catch (err) {
      console.error('Failed to preview upgrade:', err);
    } finally {
      setUpgradeLoading(null);
    }
  };

  const pollUpgradeStatus = () => {
    const POLL_INTERVAL = 2000;
    const MAX_DURATION = 5 * 60 * 1000; // 5 minutes
    const start = Date.now();

    return new Promise((resolve) => {
      const poll = async () => {
        if (Date.now() - start > MAX_DURATION) {
          resolve('timeout');
          return;
        }
        try {
          const res = await apiClient.get(UPGRADE_STATUS);
          const status = res.data?.data?.status;
          if (status === 'paid') { resolve('paid'); return; }
          if (status === 'failed') { resolve('failed'); return; }
        } catch {
          // Keep polling on network errors
        }
        setTimeout(poll, POLL_INTERVAL);
      };
      poll();
    });
  };

  const refreshAfterUpgrade = async () => {
    await apiClient.get(REFRESH_USER_COOKIE);
    const subscriptionData = await getShopSubscriptionStatus();
    if (subscriptionData?.lookup_key) {
      setSubscriptionLookupKey(subscriptionData.lookup_key);
      setCurrentLookupKey(subscriptionData.lookup_key);
    }
  };

  const handleConfirmUpgrade = async (e) => {
    e?.preventDefault();
    if (!upgradePreview || confirmLoading) return;
    setConfirmLoading(true);
    setUpgradeStatus('processing');
    try {
      await apiClient.post(UPGRADE_SUBSCRIPTION, { lookup_key: upgradePreview.lookupKey });

      const result = await pollUpgradeStatus();
      setUpgradeStatus(result);

      if (result === 'paid') {
        await refreshAfterUpgrade();
      }
    } catch (err) {
      console.error('Failed to upgrade:', err);
      setUpgradeStatus('failed');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleGoToPortal = async () => {
    try {
      const response = await apiClient.post(CREATE_PORTAL_SESSION);
      const portalUrl = response.data?.data?.url;
      if (portalUrl) window.location.href = portalUrl;
    } catch (err) {
      console.error('Failed to open billing portal:', err);
    }
  };

  const handleCancelSchedule = async () => {
    if (cancelScheduleLoading) return;
    setCancelScheduleLoading(true);
    try {
      await apiClient.post(CANCEL_SCHEDULE);
      setDowngradeDate(null);
      window.location.reload();
    } catch (err) {
      console.error('Failed to cancel scheduled downgrade:', err);
    } finally {
      setCancelScheduleLoading(false);
    }
  };

  const handleDowngrade = (lookupKey, planName, plan) => {
    setDowngradePreview({ planName, lookupKey, price: plan.price, interval: plan.interval });
    setDowngradeConfirmText('');
    setDowngradeResult(null);
  };

  const handleConfirmDowngrade = async (e) => {
    e?.preventDefault();
    if (!downgradePreview || downgradeLoading) return;
    if (downgradeConfirmText.trim().toLowerCase() !== 'confirm') return;
    setDowngradeLoading(true);
    try {
      const response = await apiClient.post(DOWNGRADE_SUBSCRIPTION, { lookup_key: downgradePreview.lookupKey });
      const data = response.data?.data;
      if (data) {
        const effectiveDate = new Date(data.effective_at * 1000).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        });
        setDowngradeResult({ effectiveDate });
        setDowngradeDate(effectiveDate);
      }
    } catch (err) {
      console.error('Failed to downgrade:', err);
    } finally {
      setDowngradeLoading(false);
    }
  };

  const closeDowngradeDialog = (value) => {
    if (downgradeLoading) return;
    if (value === false || value === undefined) {
      setDowngradePreview(null);
      setDowngradeResult(null);
      setDowngradeConfirmText('');
    }
  };

  const closeUpgradePreview = (value) => {
    if (confirmLoading) return;
    if (value === false || value === undefined) {
      setUpgradePreview(null);
      setUpgradeStatus(null);
    }
  };

  const openBenefitsPopup = (planName, features) => {
    setBenefitsPopup({ planName, features });
  };

  const closeBenefitsPopup = () => setBenefitsPopup(null);

  return (
    <div className={styles.planAndUpgradeWrapper}>
      {/* Current plan */}
      <section className={styles.contentSection}>
        <p className={styles.sectionLabel}>Current plan</p>
        <div className={styles.currentPlanCard}>
          {currentPlan ? (
            <>
              <div className={styles.currentPlanHeader}>
                <div className={styles.currentPlanInfo}>
                  <h3>{currentPlan.name}</h3>
                  <p className={styles.planDescription}>{currentPlan.description}</p>
                  <p className={styles.planPrice}>
                    SGD {currentPlan.price.toFixed(2)} / {currentPlan.interval === 'year' ? 'year' : 'month'}
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.seeAllBenefits}
                  onClick={() => openBenefitsPopup(currentPlan.name, currentPlan.features)}
                >
                  See all benefits <FaChevronDown size={12} />
                </button>
              </div>
              {cancelDate && (
                <div className={styles.cancelBanner}>
                  <p>
                    Your subscription will end on <strong>{cancelDate}</strong>.
                  </p>
                  <button type="button" className={styles.cancelBannerLink} onClick={handleGoToPortal}>
                    Don&rsquo;t cancel subscription →
                  </button>
                </div>
              )}
              {downgradeDate && !cancelDate && (
                <div className={styles.downgradeBanner}>
                  <p>
                    Your plan will be updated or downgraded on <strong>{downgradeDate}</strong>.
                  </p>
                  <button
                    type="button"
                    className={styles.downgradeBannerLink}
                    onClick={handleCancelSchedule}
                    disabled={cancelScheduleLoading}
                  >
                    {cancelScheduleLoading ? 'Cancelling…' : 'Cancel downgrade →'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={styles.noPlan}>
              You don’t have an active plan. <Link href="/app/subscription">View plans and upgrade</Link>.
            </div>
          )}
        </div>
      </section>

      {/* Upgrade / Downgrade options */}
      <section className={styles.contentSection}>
        <p className={styles.sectionLabel}>{isDowngrade ? 'Downgrade options' : 'Upgrade options'}</p>

        {(cancelDate || downgradeDate) ? (
          <div className={styles.lockedBanner}>
            {cancelDate ? (
              <p>
                Your subscription is set to cancel on <strong>{cancelDate}</strong>. To change your plan, please reactivate your subscription first.
              </p>
            ) : (
              <p>
                A plan change is already scheduled for <strong>{downgradeDate}</strong>. To make a different change, please cancel the pending downgrade first.
              </p>
            )}
            {cancelDate ? (
              <button type="button" className={styles.lockedBannerLink} onClick={handleGoToPortal}>
                Reactivate subscription →
              </button>
            ) : (
              <button
                type="button"
                className={styles.lockedBannerLink}
                onClick={handleCancelSchedule}
                disabled={cancelScheduleLoading}
              >
                {cancelScheduleLoading ? 'Cancelling…' : 'Cancel pending downgrade →'}
              </button>
            )}
          </div>
        ) : (
        <>
        <div className={styles.sectionHeaderRow}>
          <span />
          <div className={styles.billingToggle} aria-label="Billing interval">
            <button
              type="button"
              className={`${styles.billingToggleButton} ${billingInterval === 'month' ? styles.billingToggleButtonActive : ''}`}
              onClick={() => setBillingInterval('month')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`${styles.billingToggleButton} ${billingInterval === 'year' ? styles.billingToggleButtonActive : ''}`}
              onClick={() => setBillingInterval('year')}
            >
              Yearly
            </button>
          </div>
        </div>
        {visiblePlans.length > 0 || !isDowngrade ? (
          <div className={styles.upgradeGrid}>
            {visiblePlans.map((plan) => (
                <div
                  key={plan.lookup_key}
                  className={styles.upgradeCard}
                >
                  <div className={styles.upgradeCardHeader}>
                    <h3>{plan.name}</h3>
                    <p className={styles.planDescription}>{plan.description}</p>
                    <p className={styles.planPrice}>
                      SGD {plan.price.toFixed(2)} / {plan.interval === 'year' ? 'year' : 'month'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.seeAllBenefits}
                    onClick={() => openBenefitsPopup(plan.name, plan.features)}
                  >
                    See all benefits <FaChevronDown size={12} />
                  </button>
                  <div className={styles.upgradeCardFooter}>
                    <button
                      type="button"
                      className={styles.upgradeButton}
                      onClick={() => isDowngrade
                        ? handleDowngrade(plan.lookup_key, plan.name, plan)
                        : handleUpgrade(plan.lookup_key, plan.name, plan.interval)
                      }
                      disabled={upgradeLoading !== null}
                    >
                      {upgradeLoading === plan.lookup_key ? (
                        <span className={styles.buttonLoadingContent}>
                          <CircularProgress size={16} color="inherit" />
                          Loading…
                        </span>
                      ) : isDowngrade ? 'Downgrade' : 'Upgrade'}
                    </button>
                  </div>
                </div>
            ))}
            {!isDowngrade && visiblePlans.length === 0 && (
              <div className={styles.infoCard}>
                <p>
                  Looking to switch to a monthly plan? Monthly plans are priced lower than your current plan.
                  Visit <Link href="/app/subscription/manage/downgrade">Downgrade Subscription</Link> to view available monthly options.
                </p>
              </div>
            )}
            {!isDowngrade && (
              <div className={styles.upgradeCard}>
                <div className={styles.upgradeCardHeader}>
                  <h3>More than 6 Outlets</h3>
                  <p className={styles.planDescription}>
                    Running more than 6 outlets? Contact us for custom enterprise pricing tailored to your needs.
                  </p>
                  <p className={styles.planPrice}>Custom</p>
                </div>
                <div className={styles.upgradeCardFooter}>
                  <a
                    href="/contact"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.contactUsButton}
                  >
                    Contact Us
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.emptyState}>
            {"You're already on the lowest tier plan. There are no downgrade options available."}
          </div>
        )}
        </>
        )}
      </section>

      <Dialog
        open={benefitsPopup !== null}
        onClose={closeBenefitsPopup}
        maxWidth="sm"
        fullWidth
        PaperProps={{ className: styles.benefitsDialogPaper }}
      >
        <DialogTitle className={styles.benefitsDialogTitle}>
          <span>{benefitsPopup?.planName ?? ''} – Benefits</span>
          <button type="button" className={styles.benefitsDialogClose} onClick={closeBenefitsPopup} aria-label="Close">
            <IoCloseSharp size={22} />
          </button>
        </DialogTitle>
        <DialogContent className={styles.benefitsDialogContent}>
          {benefitsPopup?.features && <BenefitsList features={benefitsPopup.features} className={styles.benefitsListInPopup} />}
        </DialogContent>
        <DialogActions className={styles.benefitsDialogActions}>
          <Button onClick={closeBenefitsPopup} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upgrade preview modal */}
      <DialogPopup
        title={
          upgradeStatus === 'paid'
            ? 'Upgrade Successful'
            : upgradeStatus === 'failed' || upgradeStatus === 'timeout'
              ? 'Upgrade Failed'
              : `Upgrade to ${upgradePreview?.planName ?? ''}`
        }
        actionTitle={
          upgradeStatus === 'paid'
            ? 'Done'
            : upgradeStatus === 'failed' || upgradeStatus === 'timeout'
              ? 'Close'
              : confirmLoading
                ? 'Processing…'
                : 'Confirm Upgrade'
        }
        actionDisabled={confirmLoading}
        isOpen={upgradePreview !== null}
        setIsOpen={closeUpgradePreview}
        onSubmit={
          upgradeStatus === 'paid'
            ? (e) => { e.preventDefault(); window.location.reload(); }
            : upgradeStatus === 'failed' || upgradeStatus === 'timeout'
              ? (e) => { e.preventDefault(); closeUpgradePreview(); }
              : handleConfirmUpgrade
        }
        maxWidth="sm"
      >
        <div className={styles.upgradePreviewContent}>
          {/* Default: show pricing preview */}
          {!upgradeStatus && upgradePreview?.data && (
            <>
              <div className={styles.previewRow}>
                <span className={styles.previewLabel}>Pay today</span>
                <span className={styles.previewAmount}>
                  SGD {upgradePreview.data.amount_due_today_formatted}
                </span>
              </div>

              <div className={styles.previewRow}>
                <span className={styles.previewLabel}>
                  Then per {upgradePreview.interval === 'year' ? 'year' : 'month'}
                </span>
                <span className={styles.previewAmount}>
                  SGD {upgradePreview.data.new_recurring_amount_formatted}
                </span>
              </div>

              <p className={styles.previewExplanation}>
                The amount due today includes prorated credits for your current plan and charges for the new plan.
              </p>
            </>
          )}

          {/* Processing: waiting for payment confirmation */}
          {upgradeStatus === 'processing' && (
            <div className={styles.upgradeStatusCenter}>
              <CircularProgress size={40} />
              <p className={styles.upgradeStatusText}>Processing your upgrade…</p>
              <p className={styles.previewExplanation}>This may take a moment. Please do not close this window.</p>
            </div>
          )}

          {/* Success */}
          {upgradeStatus === 'paid' && (
            <div className={styles.upgradeStatusCenter}>
              <div className={styles.successIcon}>
                <FaCheck size={28} />
              </div>
              <p className={styles.upgradeStatusText}>Your plan has been upgraded successfully!</p>
              <p className={styles.previewExplanation}>
                You are now on the <strong>{upgradePreview?.planName}</strong> plan.
              </p>
            </div>
          )}

          {/* Failed or timeout */}
          {(upgradeStatus === 'failed' || upgradeStatus === 'timeout') && (
            <div className={styles.upgradeStatusCenter}>
              <div className={styles.upgradeErrorBanner}>
                {upgradeStatus === 'timeout'
                  ? 'Payment confirmation timed out. Your payment may still be processing.'
                  : 'Payment failed. Please update your payment method and try again.'}
              </div>
              <button
                type="button"
                className={styles.portalLink}
                onClick={handleGoToPortal}
              >
                Update payment method →
              </button>
            </div>
          )}
        </div>
      </DialogPopup>

      {/* Downgrade confirmation / result modal */}
      <DialogPopup
        title={downgradeResult ? 'Downgrade Scheduled' : `Downgrade to ${downgradePreview?.planName ?? ''}`}
        actionTitle={
          downgradeResult
            ? 'Done'
            : downgradeLoading
              ? 'Processing…'
              : 'Confirm Downgrade'
        }
        actionDisabled={
          downgradeResult
            ? false
            : downgradeLoading || downgradeConfirmText.trim().toLowerCase() !== 'confirm'
        }
        isOpen={downgradePreview !== null}
        setIsOpen={closeDowngradeDialog}
        onSubmit={
          downgradeResult
            ? (e) => { e.preventDefault(); window.location.reload(); }
            : handleConfirmDowngrade
        }
        maxWidth="sm"
      >
        <div className={styles.upgradePreviewContent}>
          {/* Step 1: Confirm downgrade */}
          {!downgradeResult && downgradePreview && (
            <>
              <div className={styles.previewRow}>
                <span className={styles.previewLabel}>New plan</span>
                <span className={styles.previewAmount}>{downgradePreview.planName}</span>
              </div>

              <div className={styles.previewRow}>
                <span className={styles.previewLabel}>New price</span>
                <span className={styles.previewAmount}>
                  SGD {downgradePreview.price.toFixed(2)} / {downgradePreview.interval === 'year' ? 'year' : 'month'}
                </span>
              </div>

              <p className={styles.previewExplanation}>
                Your current plan will remain active until the end of your billing period. After that, you will be moved to the new plan.
              </p>

              <div className={styles.confirmInputWrap}>
                <label className={styles.confirmInputLabel} htmlFor="downgrade-confirm">
                  Type <strong>confirm</strong> to proceed with the downgrade
                </label>
                <input
                  id="downgrade-confirm"
                  type="text"
                  className={styles.confirmInput}
                  placeholder="Type &quot;confirm&quot; here"
                  value={downgradeConfirmText}
                  onChange={(e) => setDowngradeConfirmText(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </>
          )}

          {/* Step 2: Success */}
          {downgradeResult && downgradePreview && (
            <>
              <div className={styles.upgradeStatusCenter}>
                <div className={styles.successIcon}>
                  <FaCheck size={28} />
                </div>
                <p className={styles.upgradeStatusText}>Downgrade scheduled successfully</p>
              </div>

              <div className={styles.previewRow}>
                <span className={styles.previewLabel}>New plan</span>
                <span className={styles.previewAmount}>{downgradePreview.planName}</span>
              </div>

              <div className={styles.previewRow}>
                <span className={styles.previewLabel}>New price</span>
                <span className={styles.previewAmount}>
                  SGD {downgradePreview.price.toFixed(2)} / {downgradePreview.interval === 'year' ? 'year' : 'month'}
                </span>
              </div>

              <div className={styles.previewRow}>
                <span className={styles.previewLabel}>Effective on</span>
                <span className={styles.previewAmount}>{downgradeResult.effectiveDate}</span>
              </div>

              <p className={styles.previewExplanation}>
                Your current plan will remain active until {downgradeResult.effectiveDate}. After that, you will automatically switch to the new plan.
              </p>
            </>
          )}
        </div>
      </DialogPopup>
    </div>
  );
}
