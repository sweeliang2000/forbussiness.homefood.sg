'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { IoCloseSharp } from 'react-icons/io5';
import styles from './ManageSubscription.module.css';
import { getSubscriptionLookupKey } from '@/utility/subscriptionStorage';
import { SUBSCRIPTION_DATA } from '../data/SUBSCRIPTION_DATA';
import apiClient from '@/utility/api';
import { CHECKOUT_SESSION_STRIPE } from '@/utility/apiPaths';
import { FaChevronDown, FaCheck } from 'react-icons/fa';

const PLAN_TIER = { '1_outlets': 1, '2-3_outlets': 2, '4-6_outlets': 3 };

function getTier(lookupKey) {
  if (!lookupKey) return 0;
  const base = lookupKey.replace('_yearly', '');
  return PLAN_TIER[base] ?? 0;
}

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

  useEffect(() => {
    const key = getSubscriptionLookupKey();
    setCurrentLookupKey(key);
  }, []);

  const currentPlan = useMemo(() => {
    if (!currentLookupKey) return null;
    return SUBSCRIPTION_DATA.find((p) => p.lookup_key === currentLookupKey) || null;
  }, [currentLookupKey]);

  const currentTier = useMemo(() => getTier(currentLookupKey), [currentLookupKey]);

  const visiblePlans = useMemo(() => {
    const isYearly = billingInterval === 'year';
    const baseKeys = ['1_outlets', '2-3_outlets', '4-6_outlets'];

    return baseKeys
      .map((baseKey) => {
        const lookupKey = isYearly ? `${baseKey}_yearly` : baseKey;
        const plan = SUBSCRIPTION_DATA.find((p) => p.lookup_key === lookupKey);
        if (!plan) return null;
        if (currentLookupKey && plan.lookup_key === currentLookupKey) return null;
        const tier = getTier(plan.lookup_key);
        if (isDowngrade && tier >= currentTier) return null;
        if (!isDowngrade && tier <= currentTier) return null;
        return plan;
      })
      .filter(Boolean);
  }, [billingInterval, currentLookupKey, currentTier, isDowngrade]);

  const handleUpgrade = async (lookupKey) => {
    if (upgradeLoading) return;
    setUpgradeLoading(lookupKey);
    try {
      const response = await apiClient.post(CHECKOUT_SESSION_STRIPE, { lookup_key: lookupKey });
      const url = response.data?.data?.url;
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Failed to start checkout:', err);
    } finally {
      setUpgradeLoading(null);
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
        <div className={styles.sectionHeaderRow}>
          <p className={styles.sectionLabel}>{isDowngrade ? 'Downgrade options' : 'Upgrade options'}</p>
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
                      onClick={() => handleUpgrade(plan.lookup_key)}
                      disabled={upgradeLoading !== null}
                    >
                      {upgradeLoading === plan.lookup_key ? 'Redirecting…' : isDowngrade ? 'Downgrade' : 'Upgrade'}
                    </button>
                  </div>
                </div>
            ))}
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
    </div>
  );
}
