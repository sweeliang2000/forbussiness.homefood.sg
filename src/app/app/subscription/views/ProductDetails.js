'use client';

import { useState, useMemo } from 'react';
import styles from './ProductDetails.module.css';
import PricingCard from './PricingCard';
import { SUBSCRIPTION_DATA } from '../data/SUBSCRIPTION_DATA';
import apiClient from '@/utility/api';
import { CHECKOUT_SESSION_STRIPE, REDEMPTION_CODE } from '@/utility/apiPaths';
import { LoadingButton } from '@mui/lab';

export default function ProductDetails() {
  const [currentPlan, setCurrentPlan] = useState(null); // Will be set based on user's current subscription
  const [billingInterval, setBillingInterval] = useState('year'); // 'month' | 'year'
  const [selectedMultipleOption, setSelectedMultipleOption] = useState('4-6'); // '4-6' | '7+'
  const [promoCode, setPromoCode] = useState('');
  const [promoTrialPeriodDays, setPromoTrialPeriodDays] = useState(null);
  // Default requested for now; will be used when promo is applied.
  const [promoLookupKey, setPromoLookupKey] = useState('1_outlets');
  const [promoError, setPromoError] = useState(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const normalizeLookupKeyFromBackend = (lookupKey) => {
    // Backend seems to sometimes return singular "outlet" keys, e.g. "1_outlet_yearly"
    // while frontend plans use plural "outlets", e.g. "1_outlets_yearly".
    return lookupKey
      ?.replace(/_outlet_/, '_outlets_')
      ?.replace(/_outlet$/, '_outlets');
  };

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
      isPopular: true,
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
      isPopular: false,
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

  const handlePlanSelect = async (plan, promoOverride = null) => {
    // Handle custom option - show contact us
    if (plan.isCustom && plan.selectedPlanType === 'custom') {
      console.log('Contact us for custom multi-outlet pricing');
      // TODO: Add contact us logic here (e.g., open modal, redirect to contact page, etc.)
      return false;
    }

    try {
      const lookupKey = plan.lookupKey;
      console.log(`Selected plan: ${plan.title} ${lookupKey}`);

      const trialPeriodDaysToUse = promoOverride?.trialPeriodDays ?? promoTrialPeriodDays;
      const lookupKeyToUse = promoOverride?.lookupKey ?? promoLookupKey;

      const checkoutLookupKey = trialPeriodDaysToUse !== null ? lookupKeyToUse : lookupKey;

      const payload = {
        lookup_key: checkoutLookupKey,
        ...(trialPeriodDaysToUse !== null ? { trial_period_days: trialPeriodDaysToUse } : {}),
      };

      const response = await apiClient.post(CHECKOUT_SESSION_STRIPE, payload);

      // console.log('response', response);
      
      // Redirect to Stripe Checkout
      if (response.data?.data?.url) {
        window.location.href = response.data.data.url;
        return true;
      }
      // No redirect URL means checkout session creation didn't succeed.
      if (promoOverride) {
        setPromoError('Unable to create checkout session');
      }
      return false;
    } catch (error) {
      const errorData = error?.response?.data;
      const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
      const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
      console.error(`Error creating checkout session: ${message} (Error code: ${code})`);

      // If this checkout was triggered by applying a promo code,
      // surface the backend error directly under the promo input.
      if (promoOverride) {
        setPromoTrialPeriodDays(null);
        setPromoError(message);
      }
      return false;
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

  const handleApplyPromo = async (e) => {
    e.preventDefault();
    const code = promoCode.trim();
    if (!code) return;

    setIsApplyingPromo(true);
    setPromoError(null);
    setPromoTrialPeriodDays(null);

    try {
      // Your backend is expected to resolve the promo code into the redemption
      // context used by this endpoint. For now we pass the input directly.
      const redemptionId = code;
      const redemptionRes = await apiClient.get(REDEMPTION_CODE, {
        params: { redemption_id: redemptionId },
      });

      const trialDaysFromRedemptionCode =
        redemptionRes?.data?.data?.trial_days ?? redemptionRes?.data?.trial_days;
      if (trialDaysFromRedemptionCode === undefined || trialDaysFromRedemptionCode === null) {
        setPromoError(redemptionRes?.data?.message || 'No redemption code found');
        setIsApplyingPromo(false);
        return;
      }

      const lookupKeyFromRedemptionCode =
        redemptionRes?.data?.data?.lookup_key ?? redemptionRes?.data?.lookup_key;

      const normalizedLookupKey = normalizeLookupKeyFromBackend(lookupKeyFromRedemptionCode);

      setPromoTrialPeriodDays(Number(trialDaysFromRedemptionCode));
      setPromoLookupKey(normalizedLookupKey || '1_outlets');

      // If promo redeemed successfully, immediately proceed to checkout using
      // backend-provided lookup_key + trial_days.
      if (plans?.length) {
        const redirected = await handlePlanSelect(plans[0], {
          lookupKey: normalizedLookupKey || '1_outlets',
          trialPeriodDays: Number(trialDaysFromRedemptionCode),
        });

        // If checkout was not redirected (typically due to an error),
        // stop the button loading state.
        if (!redirected) setIsApplyingPromo(false);
      } else {
        setIsApplyingPromo(false);
      }
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
        <div
          className={`${styles.promoBanner} ${billingInterval === 'month' ? styles.promoBannerMonthly : ''}`}
          role="note"
          aria-label="Promotion"
        >
          <span className={styles.promoBannerText}>
            Get free Scan to Win Banner for 1 year subscription for the first time.{' '}
            <a className={styles.promoBannerLink} href="/#contact">
              Contact us to redeem
            </a>
            .
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
          <LoadingButton
            className={styles.promoCodeButton}
            type="submit"
            loading={isApplyingPromo}
            loadingPosition="start"
            disabled={isApplyingPromo}
            variant="contained"
          >
            {isApplyingPromo ? '' : 'Enter'}
          </LoadingButton>
        </div>
        {promoError ? <p className={styles.promoCodeError}>{promoError}</p> : null}
      </form>
    </div>
  );
}