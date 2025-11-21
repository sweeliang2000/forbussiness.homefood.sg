'use client';

import { useState } from 'react';
import styles from './ProductDetails.module.css';
import PricingCard from './PricingCard';
import { FOUR_TO_SIX_OUTLET_MONTHLY, FOUR_TO_SIX_OUTLET_YEARLY, ONE_OUTLET_MONTHLY, ONE_OUTLET_YEARLY, TWO_TO_THREE_OUTLET_MONTHLY, TWO_TO_THREE_OUTLET_YEARLY } from '../keys/SubscriptionKeys';
import apiClient from '@/utility/api';
import { CHECKOUT_SESSION_STRIPE } from '@/utility/apiPaths';

const professionalPlanTypes = [
  { value: '2-3', label: '2 - 3 Outlets' },
  { value: '4-6', label: '4 - 6 Outlets' },
  { value: 'others', label: 'More than 6 Outlets' }
];

const getProfessionalFeatures = (planType) => {
  const baseFeatures = [
    { name: 'Release to app', included: true },
  ];

  switch (planType) {
    case '2-3':
      return [
        { name: 'Release to app', included: true },
        { name: '2 - 3 Outlets / Shops', included: true },
        { name: 'Max of 9 users', included: true },
        { name: 'Console management access', included: true },
        { name: 'Loyalty System (e.g., stamp)', included: true },
        { name: 'Priority Support', included: true },
        { name: 'Analytics', included: true },
        { name: 'Custom Integration Support', included: false }
      ];
    case '4-6':
      return [
        { name: 'Release to app', included: true },
        { name: '4 - 6 Outlets / Shops', included: true },
        { name: 'Max of 18 users', included: true },
        { name: 'Console management access', included: true },
        { name: 'Loyalty System (e.g., stamp)', included: true },
        { name: 'Priority Support', included: true },
        { name: 'Analytics', included: true },
        { name: 'Custom Integration Support', included: true }
      ];
    case 'others':
      return [
        { name: 'Release to app', included: true },
        { name: 'Number of Outlets / Shops based on your needs', included: true },
        { name: 'Number of users based on your needs', included: true },
        { name: 'Console management access', included: true },
        { name: 'Loyalty System (e.g., stamp)', included: true },
        { name: 'Analytics', included: true },
        { name: 'Highest Priority Support', included: true },
        { name: 'Custom Integration Support', included: true }
      ];
    default:
      return baseFeatures;
  }
};

const getProfessionalPrice = (planType, billingCycle) => {
  switch (planType) {
    case '2-3':
      return billingCycle === 'annually' ? (1920 / 12) : 200;
    case '4-6':
      return billingCycle === 'annually' ? (3840 / 12) : 400;
    case 'others':
      return null; // Will show as "Custom"
    default:
      return 100;
  }
};

const getProfessionalLookupKey = (planType) => {
  switch (planType) {
    case '2-3':
      return {
        'monthly': TWO_TO_THREE_OUTLET_MONTHLY,
        'annually': TWO_TO_THREE_OUTLET_YEARLY
      };
    case '4-6':
      return {
        'monthly': FOUR_TO_SIX_OUTLET_MONTHLY,
        'annually': FOUR_TO_SIX_OUTLET_YEARLY
      };
    case 'others':
      return {
        'monthly': 'custom_outlets-monthly',
        'annually': 'custom_outlets-yearly'
      };
    default:
      return {
        'monthly': '2-3_outlets-monthly',
        'annually': '2-3_outlets-yearly'
      };
  }
};

export default function ProductDetails() {
  const [billingCycle, setBillingCycle] = useState('annually');
  const [currentPlan, setCurrentPlan] = useState('Starter Plan'); // Example: 'Starter Plan'
  const [professionalPlanType, setProfessionalPlanType] = useState('2-3');

  const plans = [
    {
      title: 'Starter Plan',
      price: 'Free',
      description: 'Everything you need to start creating.',
      features: [
        { name: 'Release to app', included: false },
        { name: '1 Outlet / Shop', included: true },
        { name: 'Max of 3 users', included: true },
        { name: 'Console management access', included: true },
        { name: 'Loyalty System (e.g., stamp)', included: true },
        { name: 'Customer Support', included: true },
        { name: 'Analytics', included: false },
        { name: 'Custom Integration Support', included: false },
      ]
    },
    {
      title: 'Single Outlet Plan',
      price: billingCycle === 'annually' ? 80 : 100,
      lookupKey: 'plan_2_outlets',
      isPopular: true,
      description: 'For the mockup enthusiasts and template lovers.',
      features: [
        { name: 'Release to app', included: true },
        { name: '1 Outlet / Shop', included: true },
        { name: 'Max of 3 users', included: true },
        { name: 'Console management access', included: true },
        { name: 'Loyalty System (e.g., stamp)', included: true },
        { name: 'Customer Support', included: true },
        { name: 'Analytics', included: true },
        { name: 'Custom Integration Support', included: false },
      ],
      lookupKey: {
        'monthly': 'plan_2_outlets',
        'annually': 'plan_2_outlets'
      }
    },
    {
      title: 'Multiple Outlet Plan',
      price: getProfessionalPrice(professionalPlanType, billingCycle),
      description: 'For businesses with multiple outlets.',
      isProfessional: true,
      selectedPlanType: professionalPlanType,
      planTypes: professionalPlanTypes,
      features: getProfessionalFeatures(professionalPlanType),
      lookupKey: 'plan_2_outlets'
    }
  ].filter(plan => plan.title === 'Starter Plan' ? currentPlan === 'Starter Plan' : true);

  const handlePlanSelect = async (plan) => {
    if (plan.title === 'Professional Plan' && professionalPlanType === 'others') {
      // Handle contact us logic here
      console.log('Contact us for custom pricing');
      return;
    }

    try {
      const lookupKey = plan.lookupKey[billingCycle];
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

  const handleProfessionalPlanTypeChange = (type) => {
    setProfessionalPlanType(type);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Grow Customer Loyalty Without Building an App</h1>
        <p className={styles.subtitle}>
          Get started for free. Upgrade anytime when you&apos;re ready. Save 20% with annual billing. All prices are in SGD.
        </p>
        
        <div className={styles.billingToggle}>
          <span className={billingCycle === 'monthly' ? styles.active : ''}>Monthly</span>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={billingCycle === 'annually'}
              onChange={(e) => setBillingCycle(e.target.checked ? 'annually' : 'monthly')}
            />
            <span className={styles.slider}></span>
          </label>
          <span className={billingCycle === 'annually' ? styles.active : ''}>
            Annually
            <span className={styles.discount}>Save 20%</span>
          </span>
        </div>
      </div>

      <div className={styles.pricingGrid}>
        {plans.map((plan, index) => (
          <PricingCard
            key={index}
            {...plan}
            isCurrentPlan={currentPlan === plan.title}
            isGetStarted={plan.title === 'Starter Plan' && !currentPlan}
            onSelect={() => handlePlanSelect(plan)}
            onPlanTypeChange={handleProfessionalPlanTypeChange}
          />
        ))}
      </div>
    </div>
  );
} 