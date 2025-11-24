'use client';

import { useState, useMemo } from 'react';
import styles from './PricingSection.module.css';
import Abutton from '@/components/Buttons/Abutton';
import { SUBSCRIPTION_DATA } from '@/app/app/subscription/data/SUBSCRIPTION_DATA';

const PricingSection = () => {
  const [selectedOutletOption, setSelectedOutletOption] = useState('5'); // For the Multiple Outlets card dropdown

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

  // Transform SUBSCRIPTION_DATA into the format for display
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
      selectedOutletOption: selectedOutletOption,
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

  const handleOutletOptionChange = (value) => {
    setSelectedOutletOption(value);
  };

  const handleGetStarted = (plan) => {
    // For landing page, redirect to signup or subscription page
    if (plan.isCustom && plan.selectedOutletOption === 'custom') {
      // TODO: Add contact us logic
      console.log('Contact us for custom pricing');
      return;
    }
    // Redirect to signup or subscription page
    window.location.href = '/app/subscription';
  };

  return (
    <section id="pricing" className={styles.pricingSection}>
      <div className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Simple, Transparent Pricing</h2>
          <p className={styles.sectionSubtitle}>
            Choose the plan that works best for your business
          </p>
        </div>
        <div className={styles.pricingGrid}>
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`${styles.pricingCard} ${plan.isPopular ? styles.popular : ''}`}
            >
              {plan.isPopular && (
                <div className={styles.popularBadge}>Most Popular</div>
              )}
              
              <div className={styles.pricingHeader}>
                <h3>{plan.title}</h3>
                <div className={styles.price}>
                  {plan.price === 'Free' ? (
                    <>
                      <span className={styles.amount}>Free</span>
                    </>
                  ) : plan.price === null ? (
                    <>
                      <span className={styles.amount}>Custom</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.currency}>SGD $</span>
                      <span className={styles.amount}>{plan.price}</span>
                      <span className={styles.period}>/month</span>
                    </>
                  )}
                </div>
              </div>

              {plan.isCustom && (
                <select 
                  className={styles.outletSelect}
                  value={plan.selectedOutletOption}
                  onChange={(e) => handleOutletOptionChange(e.target.value)}
                >
                  {plan.outletOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}

              <p className={styles.description}>{plan.description}</p>

              <ul className={styles.features}>
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className={feature.included ? '' : styles.disabled}>
                    {feature.included ? '✓' : '✗'} {feature.name}
                  </li>
                ))}
              </ul>

              <Abutton 
                href={plan.isCustom && plan.selectedOutletOption === 'custom' ? '#' : '/app/subscription'}
                variant="primary" 
                size="medium"
                onClick={(e) => {
                  if (plan.isCustom && plan.selectedOutletOption === 'custom') {
                    e.preventDefault();
                    handleGetStarted(plan);
                  }
                }}
              >
                {plan.isCustom && plan.selectedOutletOption === 'custom' ? 'Contact Us' : 'Get Started'}
              </Abutton>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;

