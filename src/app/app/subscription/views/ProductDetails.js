'use client';

import { useState, useMemo, useEffect } from 'react';
import styles from './ProductDetails.module.css';
import PricingCard from './PricingCard';
import {
  FREE_PLAN,
  YEARLY_SAVING,
  getProPlan,
  isProLookupKey,
} from '../data/SUBSCRIPTION_DATA';
import { getSubscriptionLookupKey } from '@/utility/subscriptionStorage';
import apiClient from '@/utility/api';
import { CHECKOUT_SESSION_STRIPE, REDEMPTION_CODE } from '@/utility/apiPaths';
import { Button } from '@mui/material';

export default function ProductDetails() {
  const [currentLookupKey, setCurrentLookupKey] = useState(null);
  const [billingInterval, setBillingInterval] = useState('year'); // 'month' | 'year'
  const [promoCode, setPromoCode] = useState('');
  const [promoTrialPeriodDays, setPromoTrialPeriodDays] = useState(null);
  const [promoError, setPromoError] = useState(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  useEffect(() => {
    setCurrentLookupKey(getSubscriptionLookupKey());
  }, []);

  const isOnPro = isProLookupKey(currentLookupKey);
  const proPlan = useMemo(() => getProPlan(billingInterval), [billingInterval]);
  const isYearly = billingInterval === 'year';

  const cards = useMemo(() => {
    const freeCard = {
      title: FREE_PLAN.name,
      price: 0,
      description: FREE_PLAN.description,
      features: FREE_PLAN.features,
      lookupKey: FREE_PLAN.lookup_key,
      isFree: true,
      isPopular: false,
      // Every merchant has Free underneath; it is only the *current* plan
      // when they have no paid subscription running.
      isCurrentPlan: !isOnPro,
    };

    const proCard = proPlan && {
      title: 'Pro',
      price: proPlan.monthlyEquivalent,
      description: proPlan.description,
      features: proPlan.features,
      lookupKey: proPlan.lookup_key,
      isFree: false,
      isPopular: true,
      isCurrentPlan: currentLookupKey === proPlan.lookup_key,
      billingNote: isYearly
        ? `Billed S$${proPlan.price.toFixed(2)} once a year`
        : 'Billed every month',
      savingNote: isYearly ? `Save S$${YEARLY_SAVING.toFixed(2)} a year vs monthly` : null,
    };

    return [freeCard, proCard].filter(Boolean);
  }, [proPlan, isYearly, isOnPro, currentLookupKey]);

  const startCheckout = async (lookupKey, promoOverride = null) => {
    try {
      const trialPeriodDaysToUse = promoOverride?.trialPeriodDays ?? promoTrialPeriodDays;
      const lookupKeyToUse = promoOverride?.lookupKey ?? lookupKey;

      const payload = {
        lookup_key: lookupKeyToUse,
        ...(trialPeriodDaysToUse !== null && trialPeriodDaysToUse !== undefined
          ? { trial_period_days: trialPeriodDaysToUse }
          : {}),
      };

      const response = await apiClient.post(CHECKOUT_SESSION_STRIPE, payload);

      if (response.data?.data?.url) {
        window.location.href = response.data.data.url;
        return true;
      }
      if (promoOverride) setPromoError('Unable to create checkout session');
      return false;
    } catch (error) {
      const errorData = error?.response?.data;
      const message =
        errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
      console.error(`Error creating checkout session: ${message}`);
      if (promoOverride) {
        setPromoTrialPeriodDays(null);
        setPromoError(message);
      }
      return false;
    }
  };

  const handlePlanSelect = (card) => {
    if (card.isFree || card.isCurrentPlan) return;
    startCheckout(card.lookupKey);
  };

  const handleApplyPromo = async (e) => {
    e.preventDefault();
    const code = promoCode.trim();
    if (!code) return;

    setIsApplyingPromo(true);
    setPromoError(null);
    setPromoTrialPeriodDays(null);

    try {
      const redemptionRes = await apiClient.get(REDEMPTION_CODE, {
        params: { redemption_id: code },
      });

      const trialDays = redemptionRes?.data?.data?.trial_days ?? redemptionRes?.data?.trial_days;
      if (trialDays === undefined || trialDays === null) {
        setPromoError(redemptionRes?.data?.message || 'No redemption code found');
        setIsApplyingPromo(false);
        return;
      }

      const lookupKeyFromCode =
        redemptionRes?.data?.data?.lookup_key ?? redemptionRes?.data?.lookup_key;

      setPromoTrialPeriodDays(Number(trialDays));

      const redirected = await startCheckout(proPlan?.lookup_key, {
        lookupKey: lookupKeyFromCode || proPlan?.lookup_key,
        trialPeriodDays: Number(trialDays),
      });

      if (!redirected) setIsApplyingPromo(false);
    } catch (err) {
      setPromoTrialPeriodDays(null);
      setPromoError(err?.message || 'Failed to apply promo code');
      setIsApplyingPromo(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Grow Customer Loyalty Without Building an App</h1>
        <div className={styles.promoBanner} role="note" aria-label="Promotion">
          <span className={styles.promoBannerText}>
            Early adopter merchants are on Pro at S$0 — free for life. Your plan below reflects
            what you pay once the early adopter window closes.
          </span>
        </div>
        <div className={styles.billingToggle}>
          <button
            type="button"
            className={`${styles.toggleOption} ${billingInterval === 'month' ? styles.active : ''}`}
            onClick={() => setBillingInterval('month')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`${styles.toggleOption} ${billingInterval === 'year' ? styles.active : ''}`}
            onClick={() => setBillingInterval('year')}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className={`${styles.pricingGrid} ${styles.twoPlans}`}>
        {cards.map((card) => (
          <PricingCard
            key={card.lookupKey}
            title={card.title}
            price={card.price}
            description={card.description}
            features={card.features}
            isPopular={card.isPopular}
            isCurrentPlan={card.isCurrentPlan}
            isFree={card.isFree}
            billingNote={card.billingNote}
            savingNote={card.savingNote}
            onSelect={() => handlePlanSelect(card)}
          />
        ))}
      </div>

      <form className={styles.promoCodeRow} onSubmit={handleApplyPromo}>
        <div className={styles.promoCodeControls}>
          <input
            id="promo-code"
            className={styles.promoCodeInput}
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Enter promo code"
            autoComplete="off"
            disabled={isApplyingPromo}
          />
          <Button
            className={styles.promoCodeButton}
            type="submit"
            loading={isApplyingPromo}
            loadingPosition="start"
            disabled={isApplyingPromo}
            variant="contained"
          >
            {isApplyingPromo ? '' : 'Enter'}
          </Button>
        </div>
        {promoError ? <p className={styles.promoCodeError}>{promoError}</p> : null}
      </form>
    </div>
  );
}
