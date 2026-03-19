'use client';

import { useState, useMemo } from 'react';
import styles from './PricingSection.module.css';
import Abutton from '@/components/Buttons/Abutton';
import { SUBSCRIPTION_DATA } from '@/app/app/subscription/data/SUBSCRIPTION_DATA';

const PricingSection = () => {
  // Billing interval toggle – Yearly selected by default
  const [billingInterval, setBillingInterval] = useState('year'); // 'month' | 'year'
  // Multiple Outlets dropdown – default to 4–6 outlets
  const [selectedMultipleOption, setSelectedMultipleOption] = useState('4-6'); // '4-6' | '7+'

  // Transform SUBSCRIPTION_DATA into the format for display
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
      price: oneOutletPlan.price,
      description: oneOutletPlan.description,
      features: oneOutletPlan.features,
      lookupKey: oneOutletPlan.lookup_key,
      isPopular: true,
      isContactOnly: false,
    };

    const twoThreeCard = twoThreePlan && {
      title: twoThreePlan.name,
      price: twoThreePlan.price,
      description: twoThreePlan.description,
      features: twoThreePlan.features,
      lookupKey: twoThreePlan.lookup_key,
      isPopular: false,
      isContactOnly: false,
    };

    const isSevenPlus = selectedMultipleOption === '7+';
    const multipleOutletsCard = {
      title: 'Multiple Outlets',
      price: isSevenPlus ? null : (fourSixPlan ? fourSixPlan.price : null),
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
            { name: 'Highest Priority Support', included: true },
            { name: 'Custom Integration Support', included: true },
          ],
      lookupKey: isSevenPlus || !fourSixPlan ? null : fourSixPlan.lookup_key,
      isCustom: true,
      isContactOnly: isSevenPlus,
      selectedMultipleOption,
      outletOptions: [
        { value: '4-6', label: '4 to 6 Outlets' },
        { value: '7+', label: '7 or more Outlets' },
      ],
    };

    return [oneOutletCard, twoThreeCard, multipleOutletsCard].filter(Boolean);
  }, [billingInterval, selectedMultipleOption]);

  const handleMultipleOptionChange = (value) => {
    setSelectedMultipleOption(value);
  };

  const handleGetStarted = (plan) => {
    if (plan.isContactOnly) {
      // TODO: Add real contact flow (modal / contact page)
      console.log('Contact us for custom multi-outlet pricing');
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
          <div
            className={`${styles.promoBanner} ${billingInterval === 'month' ? styles.promoBannerMonthly : ''}`}
            role="note"
            aria-label="Promotion"
          >
            <span className={styles.promoBannerText}>
              Get free Scan to Win Banner for 1 year subscription for the first time.{' '}
              <a className={styles.promoBannerLink} href="/#contact">
                Contact us to redeem
              </a>.
            </span>
          </div>
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
                  {plan.price === null ? (
                    <>
                      <span className={styles.amount}>Custom</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.currency}>SGD $</span>
                      <span className={styles.amount}>
                        {billingInterval === 'year'
                          ? (plan.price / 12).toFixed(2)
                          : plan.price}
                      </span>
                      <span className={styles.period}>/month</span>
                    </>
                  )}
                </div>
                {billingInterval === 'year' && plan.price !== null && (
                  <div className={styles.savings}>
                    (Save SGD {(plan.price / 11).toFixed(2)} /year)
                  </div>
                )}
              </div>

              {plan.isCustom && (
                <select 
                  className={styles.outletSelect}
                  value={plan.selectedMultipleOption}
                  onChange={(e) => handleMultipleOptionChange(e.target.value)}
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
                href={plan.isContactOnly ? '#' : '/app/subscription'}
                variant="primary" 
                size="medium"
                onClick={(e) => {
                  if (plan.isContactOnly) {
                    e.preventDefault();
                    handleGetStarted(plan);
                  }
                }}
              >
                {plan.isContactOnly ? 'Contact Us' : 'Get Started'}
              </Abutton>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;

