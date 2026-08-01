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
  isFree = false,
  billingNote = null,
  savingNote = null,
  onSelect,
}) => {
  const getButtonText = () => {
    if (isCurrentPlan) return 'Current Plan';
    if (isFree) return 'Included';
    return 'Upgrade Now';
  };

  return (
    <div className={`${styles.pricingCard} ${isPopular ? styles.popular : ''}`}>
      {isPopular && <div className={styles.popularBadge}>Most Popular</div>}

      <h2 className={styles.planTitle}>{title}</h2>

      <div className={styles.price}>
        <span className={styles.amount}>
          {price === 0 ? 'Free' : `SGD $${Number(price).toFixed(2)}`}
        </span>
        {price !== 0 && <span className={styles.period}>/month</span>}
      </div>

      {billingNote && <div className={styles.billingNote}>{billingNote}</div>}
      {savingNote && <div className={styles.savings}>{savingNote}</div>}

      <p className={styles.description}>{description}</p>

      <ul className={styles.features}>
        {features.map((feature, index) => (
          <li
            key={index}
            className={`${styles.feature} ${!feature.included ? styles.disabled : ''}`}
          >
            {feature.included ? (
              <IoCheckmark className={`${styles.icon} ${styles.checkIcon}`} />
            ) : feature.na ? (
              <span className={`${styles.icon} ${styles.naIcon}`} aria-hidden="true">—</span>
            ) : (
              <IoClose className={`${styles.icon} ${styles.crossIcon}`} />
            )}
            <span className={!feature.included && !feature.na ? styles.crossedText : ''}>
              {feature.name}
              {feature.na && <span className={styles.naLabel}>not applicable</span>}
            </span>
          </li>
        ))}
      </ul>

      <button
        className={`${styles.selectButton} ${isPopular ? styles.popularButton : ''} ${isCurrentPlan ? styles.currentPlanButton : ''}`}
        onClick={onSelect}
        disabled={isCurrentPlan || isFree}
      >
        {getButtonText()}
      </button>
    </div>
  );
};

PricingCard.propTypes = {
  title: PropTypes.string.isRequired,
  price: PropTypes.number.isRequired,
  description: PropTypes.string.isRequired,
  features: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      included: PropTypes.bool.isRequired,
      // Marks a line that doesn't apply to this plan, rather than one it lacks.
      na: PropTypes.bool,
    })
  ).isRequired,
  isPopular: PropTypes.bool,
  isCurrentPlan: PropTypes.bool,
  isFree: PropTypes.bool,
  billingNote: PropTypes.string,
  savingNote: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};

export default PricingCard;
