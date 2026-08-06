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

export default function ProductDetails() {
  const [currentLookupKey, setCurrentLookupKey] = useState(null);
  const [billingInterval, setBillingInterval] = useState('year'); // 'month' | 'year'
  const [checkoutError, setCheckoutError] = useState(null);

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
    try {
      setCheckoutError(null);
      const response = await apiClient.post(CHECKOUT_SESSION_STRIPE, { plan: billingKey });

      if (response.data?.data?.url) {
        window.location.href = response.data.data.url;
        return true;
      }
      return false;
    } catch (error) {
      const errorData = error?.response?.data;
      const message =
        errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
      console.error(`Error creating checkout session: ${message}`);
      setCheckoutError(message);
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

      <p className={styles.promoCodeRow}>
        Founding Seller? Enter your promotion code securely on the Stripe checkout page.
      </p>
      {checkoutError ? <p className={styles.promoCodeError}>{checkoutError}</p> : null}
    </div>
  );
}
