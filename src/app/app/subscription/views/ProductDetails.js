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
import { CHECKOUT_SESSION_STRIPE } from '@/utility/apiPaths';
import { IoShieldCheckmarkOutline, IoSparklesOutline } from 'react-icons/io5';

export default function ProductDetails() {
  const [currentLookupKey, setCurrentLookupKey] = useState(null);
  const [billingInterval, setBillingInterval] = useState('year'); // 'month' | 'year'
  const [checkoutError, setCheckoutError] = useState(null);
  const [checkoutLoadingKey, setCheckoutLoadingKey] = useState(null);

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
      billingKey: proPlan.billingKey,
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

  const startCheckout = async (billingKey) => {
    if (checkoutLoadingKey) return false;

    try {
      setCheckoutError(null);
      setCheckoutLoadingKey(billingKey);
      const response = await apiClient.post(CHECKOUT_SESSION_STRIPE, { plan: billingKey });

      if (response.data?.data?.url) {
        // Keep the pending state visible until the browser actually leaves this
        // page. Clearing it in finally caused a distracting flash back to the
        // idle button while Stripe Checkout was still loading.
        window.location.assign(response.data.data.url);
        return true;
      }
      setCheckoutLoadingKey(null);
      return false;
    } catch (error) {
      const errorData = error?.response?.data;
      const message =
        errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
      console.error(`Error creating checkout session: ${message}`);
      setCheckoutError(message);
      setCheckoutLoadingKey(null);
      return false;
    }
  };

  const handlePlanSelect = (card) => {
    if (card.isFree || card.isCurrentPlan) return;
    startCheckout(card.billingKey);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Plans &amp; billing</p>
        <h1 className={styles.title}>Choose the plan that fits your kitchen.</h1>
        <p className={styles.subtitle}>
          Start free, then move to Pro when lower payment fees and manual PayNow make sense for your business.
        </p>
        <div className={styles.promoBanner} role="note" aria-label="Promotion">
          <span className={styles.promoIcon} aria-hidden="true"><IoSparklesOutline /></span>
          <span className={styles.promoBannerText}>
            <strong>Founding Seller offer</strong>
            Eligible early sellers can redeem Pro at S$0 for life during secure checkout.
          </span>
          <span className={styles.promoValue}>S$0 for life</span>
        </div>
        <div className={styles.billingControl}>
          <span className={styles.billingLabel}>Billing cycle</span>
          <div className={styles.billingToggle} role="group" aria-label="Billing cycle">
            <button
              type="button"
              className={`${styles.toggleOption} ${billingInterval === 'month' ? styles.active : ''}`}
              aria-pressed={billingInterval === 'month'}
              onClick={() => setBillingInterval('month')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`${styles.toggleOption} ${billingInterval === 'year' ? styles.active : ''}`}
              aria-pressed={billingInterval === 'year'}
              onClick={() => setBillingInterval('year')}
            >
              Yearly
            </button>
          </div>
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
            isLoading={checkoutLoadingKey === card.billingKey}
            onSelect={() => handlePlanSelect(card)}
          />
        ))}
      </div>

      <div className={styles.checkoutNote}>
        <IoShieldCheckmarkOutline aria-hidden="true" />
        <p>
          <strong>Secure checkout by Stripe.</strong> Founding Sellers can enter their promotion code there.
          HomeFood never stores your card details.
        </p>
      </div>
      {checkoutError ? <p className={styles.promoCodeError} role="alert">{checkoutError}</p> : null}
    </div>
  );
}
