'use client';

import React from 'react';
import PropTypes from 'prop-types';
import styles from './PricingCard.module.css';
import { IoCheckmark, IoClose } from 'react-icons/io5';

const PricingCard = ({
  title,
  price,
  description,
  features,
  isPopular = false,
  isCurrentPlan = false,
  isGetStarted = false,
  isProfessional = false,
  isCustom = false,
  onSelect,
  onPlanTypeChange,
  selectedPlanType,
  planTypes = [],
  outletOptions = []
}) => {
  const getButtonText = () => {
    if (selectedPlanType === 'others' || selectedPlanType === 'custom') return 'Contact Us';
    if (isGetStarted) return 'Get Started';
    if (isCurrentPlan) return 'Current Plan';
    return 'Upgrade Now';
  };

  // Use outletOptions if available (for custom card), otherwise use planTypes
  const dropdownOptions = isCustom && outletOptions.length > 0 ? outletOptions : planTypes;
  const showDropdown = (isProfessional || isCustom) && dropdownOptions.length > 0;

  return (
    <div className={`${styles.pricingCard} ${isPopular ? styles.popular : ''}`}>
      {isPopular && <div className={styles.popularBadge}>Most Popular</div>}
      
      <h2 className={styles.planTitle}>{title}</h2>
      
      <div className={styles.price}>
        <span className={styles.amount}>
          {selectedPlanType === 'others' || selectedPlanType === 'custom' || price === null 
            ? 'Custom' 
            : (typeof price === 'number' ? `SGD $${price}` : price)}
        </span>
        {price !== 'Free' && price !== null && selectedPlanType !== 'others' && selectedPlanType !== 'custom' && <span className={styles.period}>/month</span>}
      </div>
      
      <p className={styles.description}>{description}</p>

      {showDropdown && (
        <select 
          className={styles.planTypeSelect}
          value={selectedPlanType}
          onChange={(e) => onPlanTypeChange(e.target.value)}
        >
          {dropdownOptions.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      )}
      
      <ul className={styles.features}>
        {features.map((feature, index) => (
          <li 
            key={index} 
            className={`${styles.feature} ${!feature.included ? styles.disabled : ''}`}
          >
            {feature.included ? (
              <IoCheckmark className={`${styles.icon} ${styles.checkIcon}`} />
            ) : (
              <IoClose className={`${styles.icon} ${styles.crossIcon}`} />
            )}
            <span className={!feature.included ? styles.crossedText : ''}>
              {feature.name}
            </span>
          </li>
        ))}
      </ul>

      <button 
        className={`${styles.selectButton} ${isPopular ? styles.popularButton : ''} ${isCurrentPlan ? styles.currentPlanButton : ''}`}
        onClick={onSelect}
        disabled={isCurrentPlan}
      >
        {getButtonText()}
      </button>
    </div>
  );
};

PricingCard.propTypes = {
  title: PropTypes.string.isRequired,
  price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  description: PropTypes.string.isRequired,
  features: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      included: PropTypes.bool.isRequired,
    })
  ).isRequired,
  isPopular: PropTypes.bool,
  isCurrentPlan: PropTypes.bool,
  isGetStarted: PropTypes.bool,
  isProfessional: PropTypes.bool,
  isCustom: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
  onPlanTypeChange: PropTypes.func,
  selectedPlanType: PropTypes.string,
  planTypes: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  outletOptions: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
};

export default PricingCard; 