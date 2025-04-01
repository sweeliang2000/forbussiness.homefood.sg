'use client';

import { useState } from 'react';
import styles from './page.module.css';
import PricingCard from './views/PricingCard';

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
  const basePrice = billingCycle === 'annually' ? 12 : 15;
  switch (planType) {
    case '2-3':
      return basePrice * 2;
    case '4-6':
      return basePrice * 4;
    case 'others':
      return null; // Will show as "Custom"
    default:
      return basePrice;
  }
};

export default function SubscriptionPage() {
  const [billingCycle, setBillingCycle] = useState('annually');
  const [currentPlan, setCurrentPlan] = useState('Starter Plan');
  const [professionalPlanType, setProfessionalPlanType] = useState('2-3');

  const plans = [
    {
      title: 'Starter Plan',
      price: 'Free',
      description: 'Everything you need to start creating.',
      features: [
        { name: 'Release to app', included: false },
        { name: '1 Outlet / Shop', included: true },
        { name: 'Max of 1 user', included: true },
        { name: 'Console management access', included: true },
        { name: 'Loyalty System (e.g., stamp)', included: true },
        { name: 'Customer Support', included: true },
        { name: 'Analytics', included: false },
        { name: 'Custom Integration Support', included: false },
      ]
    },
    {
      title: 'Lite Plan',
      price: billingCycle === 'annually' ? 7 : 9,
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
      ]
    },
    {
      title: 'Professional Plan',
      price: getProfessionalPrice(professionalPlanType, billingCycle),
      description: 'For businesses with multiple outlets.',
      isProfessional: true,
      selectedPlanType: professionalPlanType,
      planTypes: professionalPlanTypes,
      features: getProfessionalFeatures(professionalPlanType)
    }
  ];

  const handlePlanSelect = (plan) => {
    if (plan.title === 'Professional Plan' && professionalPlanType === 'others') {
      // Handle contact us logic here
      console.log('Contact us for custom pricing');
      return;
    }
    console.log(`Selected plan: ${plan.title}`);
    setCurrentPlan(plan.title);
  };

  const handleProfessionalPlanTypeChange = (type) => {
    setProfessionalPlanType(type);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Simple pricing for all your needs</h1>
        <p className={styles.subtitle}>
          Start for free, upgrade when you love it --- No credit card required. All prices are in US Dollars.
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