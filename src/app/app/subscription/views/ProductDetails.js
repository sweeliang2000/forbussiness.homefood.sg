'use client';

import { useState, useMemo } from 'react';
import styles from './ProductDetails.module.css';
import PricingCard from './PricingCard';
import { SUBSCRIPTION_DATA } from '../data/SUBSCRIPTION_DATA';
import apiClient from '@/utility/api';
import { CHECKOUT_SESSION_STRIPE } from '@/utility/apiPaths';

export default function ProductDetails() {
  const [currentPlan, setCurrentPlan] = useState(null); // Will be set based on user's current subscription
  const [selectedOutletOption, setSelectedOutletOption] = useState('5'); // For the 3rd card dropdown

  // Get plan data for a specific number of outlets
  const getPlanByOutlets = (outlets) => {
    if (outlets === 'custom') return null;
    const outletNum = parseInt(outlets);
    // Find the plan in SUBSCRIPTION_DATA (outlets 2-10 are at indices 2-10)
    return SUBSCRIPTION_DATA.find(plan => {
      const planOutlets = parseInt(plan.name.match(/\d+/)?.[0]);
      return planOutlets === outletNum;
    });
  };

  // Transform SUBSCRIPTION_DATA into the format expected by PricingCard
  const plans = useMemo(() => {
    // Keep the free plan (index 0)
    const freePlanData = SUBSCRIPTION_DATA[0];
    const freePlan = {
      title: freePlanData.name,
      price: 'Free',
      description: freePlanData.description,
      features: freePlanData.features,
      lookupKey: freePlanData.lookup_key,
      isPopular: false,
      originalPrice: freePlanData.price
    };

    // Keep the 1 Outlet with Analytics plan (index 1)
    const analyticsPlanData = SUBSCRIPTION_DATA[1];
    const analyticsPlan = {
      title: analyticsPlanData.name,
      price: analyticsPlanData.price,
      description: analyticsPlanData.description,
      features: analyticsPlanData.features,
      lookupKey: analyticsPlanData.lookup_key,
      isPopular: true,
      originalPrice: analyticsPlanData.price
    };

    // Create custom card with dropdown
    const selectedPlan = getPlanByOutlets(selectedOutletOption);
    const customCard = {
      title: 'Multiple Outlets',
      price: selectedOutletOption === 'custom' ? null : (selectedPlan ? selectedPlan.price : null),
      description: selectedPlan ? selectedPlan.description : 'For businesses with multiple outlets. Contact us for custom pricing.',
      features: selectedPlan ? selectedPlan.features : [
        { name: 'Release to app', included: true },
        { name: 'Number of Outlets / Shops based on your needs', included: true },
        { name: 'Number of users based on your needs', included: true },
        { name: 'Console management access', included: true },
        { name: 'Loyalty System (e.g., stamp)', included: true },
        { name: 'Analytics', included: true },
        { name: 'Highest Priority Support', included: true },
        { name: 'Custom Integration Support', included: true }
      ],
      lookupKey: selectedPlan ? selectedPlan.lookup_key : null,
      isCustom: true,
      selectedPlanType: selectedOutletOption,
      outletOptions: [
        ...Array.from({ length: 9 }, (_, i) => {
          const outlets = i + 2; // 2 to 10
          return { value: String(outlets), label: `${outlets} Outlets` };
        }),
        { value: 'custom', label: 'Custom' }
      ]
    };

    return [freePlan, analyticsPlan, customCard];
  }, [selectedOutletOption]);

  const handlePlanSelect = async (plan) => {
    // Handle custom option - show contact us
    if (plan.isCustom && plan.selectedPlanType === 'custom') {
      console.log('Contact us for custom pricing');
      // TODO: Add contact us logic here (e.g., open modal, redirect to contact page, etc.)
      return;
    }

    // Don't allow selection of free plan if already on a paid plan
    if (plan.price === 'Free' && currentPlan && currentPlan !== plan.title) {
      console.log('Cannot downgrade to free plan');
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

  const handleOutletOptionChange = (value) => {
    setSelectedOutletOption(value);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Grow Customer Loyalty Without Building an App</h1>
        <p className={styles.subtitle}>
          Get started for free. Upgrade anytime when you&apos;re ready. All prices are in SGD.
        </p>
      </div>

      <div className={styles.pricingGrid}>
        {plans.map((plan, index) => (
          <PricingCard
            key={index}
            {...plan}
            isCurrentPlan={currentPlan === plan.title}
            isGetStarted={plan.price === 'Free' && !currentPlan}
            onSelect={() => handlePlanSelect(plan)}
            onPlanTypeChange={plan.isCustom ? handleOutletOptionChange : undefined}
          />
        ))}
      </div>
    </div>
  );
} 