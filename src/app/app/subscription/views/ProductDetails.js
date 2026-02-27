'use client';

import { useState, useMemo } from 'react';
import styles from './ProductDetails.module.css';
import PricingCard from './PricingCard';
import { SUBSCRIPTION_DATA } from '../data/SUBSCRIPTION_DATA';
import apiClient from '@/utility/api';
import { CHECKOUT_SESSION_STRIPE } from '@/utility/apiPaths';

export default function ProductDetails() {
  const [currentPlan, setCurrentPlan] = useState(null); // Will be set based on user's current subscription
  const [billingInterval, setBillingInterval] = useState('year'); // 'month' | 'year'
  const [selectedMultipleOption, setSelectedMultipleOption] = useState('4-6'); // '4-6' | '7+'

  // Transform SUBSCRIPTION_DATA into the format expected by PricingCard
  const plans = useMemo(() => {
    const isYearly = billingInterval === 'year';

    const findPlan = (baseKey) => {
      const lookupKey = isYearly ? `${baseKey}_yearly` : baseKey;
      return SUBSCRIPTION_DATA.find((plan) => plan.lookup_key === lookupKey) || null;
    };

    const oneOutletPlan = findPlan('1_outlets');
    const twoThreePlan = findPlan('2-3_outlets');
    const fourSixPlan = findPlan('4-6_outlets');

    const oneOutletCard = oneOutletPlan && {
      title: oneOutletPlan.name,
      price: Number((isYearly ? oneOutletPlan.price / 12 : oneOutletPlan.price).toFixed(2)),
      yearlyTotal: isYearly ? oneOutletPlan.price : null,
      description: oneOutletPlan.description,
      features: oneOutletPlan.features,
      lookupKey: oneOutletPlan.lookup_key,
      isPopular: false,
      isCustom: false,
      selectedPlanType: billingInterval,
    };

    const twoThreeCard = twoThreePlan && {
      title: twoThreePlan.name,
      price: Number((isYearly ? twoThreePlan.price / 12 : twoThreePlan.price).toFixed(2)),
      yearlyTotal: isYearly ? twoThreePlan.price : null,
      description: twoThreePlan.description,
      features: twoThreePlan.features,
      lookupKey: twoThreePlan.lookup_key,
      isPopular: true, // Highlight 2–3 outlets
      isCustom: false,
      selectedPlanType: billingInterval,
    };

    const isSevenPlus = selectedMultipleOption === '7+';
    const multipleOutletsCard = {
      title: 'Multiple Outlets',
      price: isSevenPlus || !fourSixPlan ? null : Number((isYearly ? fourSixPlan.price / 12 : fourSixPlan.price).toFixed(2)),
      yearlyTotal: isSevenPlus || !fourSixPlan || !isYearly ? null : fourSixPlan.price,
      description: isSevenPlus
        ? 'Running more than 6 outlets? Contact us for custom enterprise pricing.'
        : fourSixPlan
          ? fourSixPlan.description
          : 'For businesses with multiple outlets. Contact us for custom pricing.',
      features: fourSixPlan
        ? fourSixPlan.features
        : [
            { name: 'Scan to win', included: true },
            { name: 'Number of Outlets / Shops based on your needs', included: true },
            { name: 'Number of users based on your needs', included: true },
            { name: 'Stamp Loyalty Card', included: true },
            { name: 'Console management access', included: true },
            { name: 'Analytics', included: true },
            { name: 'Priority Support', included: true },
            { name: 'Custom Integration Support', included: true },
          ],
      lookupKey: isSevenPlus || !fourSixPlan ? null : fourSixPlan.lookup_key,
      isPopular: false,
      isCustom: true,
      selectedPlanType: isSevenPlus ? 'custom' : '4-6',
      outletOptions: [
        { value: '4-6', label: '4 to 6 Outlets' },
        { value: 'custom', label: '7 or more Outlets' },
      ],
    };

    return [oneOutletCard, twoThreeCard, multipleOutletsCard].filter(Boolean);
  }, [billingInterval, selectedMultipleOption]);

  const handlePlanSelect = async (plan) => {
    // Handle custom option - show contact us
    if (plan.isCustom && plan.selectedPlanType === 'custom') {
      console.log('Contact us for custom multi-outlet pricing');
      // TODO: Add contact us logic here (e.g., open modal, redirect to contact page, etc.)
      return;
    }

    try {
      const lookupKey = plan.lookupKey;
      console.log(`Selected plan: ${plan.title} ${lookupKey}`);
      const response = await apiClient.post(CHECKOUT_SESSION_STRIPE, {
        "lookup_key": lookupKey
      });

      console.log('response', response);
      
      // Redirect to Stripe Checkout
      if (response.data?.data?.url) {
        window.location.href = response.data.data.url;
      }
    } catch (error) {
      const errorData = error?.response?.data;
      const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
      const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
      console.error(`Error creating checkout session: ${message} (Error code: ${code})`);
      // TODO: Add proper error handling UI
    }

    // Todo: setup the current plan if user already purchased before
    // setCurrentPlan(plan.title);
  };

  const handleMultipleOptionChange = (value) => {
    // Map PricingCard's 'custom' value back to our '7+' internal state
    if (value === 'custom') {
      setSelectedMultipleOption('7+');
    } else {
      setSelectedMultipleOption(value);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Grow Customer Loyalty Without Building an App</h1>
        <p className={styles.subtitle}>
          Get started for free. Upgrade anytime when you&apos;re ready. All prices are in SGD.
        </p>
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

      <div className={styles.pricingGrid}>
        {plans.map((plan, index) => (
          <PricingCard
            key={index}
            {...plan}
            isCurrentPlan={currentPlan === plan.title}
            isGetStarted={false}
            onSelect={() => handlePlanSelect(plan)}
            onPlanTypeChange={plan.isCustom ? handleMultipleOptionChange : undefined}
          />
        ))}
      </div>
    </div>
  );
} 