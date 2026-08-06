'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaCheck } from 'react-icons/fa';
import {
    FREE_PLAN,
    PRICING_COMPARISON,
    PRO_PLAN,
    PRO_MONTHLY_PRICE,
    PRO_YEARLY_MONTHLY_PRICE,
    PRO_YEARLY_TOTAL,
} from '@/utility/pricingPlans';
import styles from './Pricing.module.css';

const FreePlan = () => (
    <article className={styles.planCard}>
        <div className={styles.planHeading}>
            <div>
                <span className={styles.planLabel}>{FREE_PLAN.name}</span>
                <div className={styles.priceLine}>
                    <span className={styles.price}>{FREE_PLAN.price}</span>
                    <span className={styles.cadence}>{FREE_PLAN.cadence}</span>
                </div>
            </div>
        </div>
        <p className={styles.planDescription}>{FREE_PLAN.description}</p>
        <FeatureList features={FREE_PLAN.features} />
        <Link href="/early-adopter" className={styles.secondaryCta}>
            Start with early access
        </Link>
    </article>
);

const FeatureList = ({ features }) => (
    <ul className={styles.planFeatures}>
        {features.map((feature) => (
            <li key={feature}>
                <span className={styles.featureIcon} aria-hidden="true"><FaCheck /></span>
                <span>{feature}</span>
            </li>
        ))}
    </ul>
);

export default function PricingPlansClient() {
    const [billing, setBilling] = useState('yearly');
    const isYearly = billing === 'yearly';
    const regularPrice = isYearly ? PRO_YEARLY_MONTHLY_PRICE : PRO_MONTHLY_PRICE;
    const regularBilling = isYearly
        ? `per month, billed ${PRO_YEARLY_TOTAL} yearly`
        : 'per month, billed monthly';

    return (
        <>
            <section id="compare" className={styles.plansSection}>
                <div className={styles.sectionHeading}>
                    <span>Two ways to sell</span>
                    <h2>Choose the plan that fits today.</h2>
                    <p>You can start free. Pro becomes more valuable as your orders grow.</p>
                </div>

                <div className={styles.billingControl}>
                    <div className={styles.billingToggle} role="group" aria-label="Pro billing frequency">
                        <button
                            type="button"
                            className={isYearly ? styles.billingActive : ''}
                            aria-pressed={isYearly}
                            onClick={() => setBilling('yearly')}
                        >
                            Yearly
                            <span>Best rate</span>
                        </button>
                        <button
                            type="button"
                            className={!isYearly ? styles.billingActive : ''}
                            aria-pressed={!isYearly}
                            onClick={() => setBilling('monthly')}
                        >
                            Monthly
                        </button>
                    </div>
                    <p>Monthly billing is 20% more than the yearly rate.</p>
                </div>

                <div className={styles.planGrid}>
                    <FreePlan />
                    <article className={`${styles.planCard} ${styles.planCardFeatured}`}>
                        <div className={styles.planHeading}>
                            <div>
                                <span className={styles.planLabel}>{PRO_PLAN.name}</span>
                                <div className={styles.regularPrice}>
                                    <s>{regularPrice}</s>
                                    <span>{regularBilling}</span>
                                </div>
                                <div className={styles.priceLine}>
                                    <span className={styles.price}>S$0.00</span>
                                    <span className={styles.cadence}>/ month for life</span>
                                </div>
                            </div>
                            <span className={styles.proPill}>Limited time</span>
                        </div>
                        <p className={styles.promotionNote}>
                            Apply during the early-adopter offer and keep the Pro platform subscription free for life.
                        </p>
                        <p className={styles.planDescription}>{PRO_PLAN.description}</p>
                        <FeatureList features={PRO_PLAN.features} />
                        <Link href="/early-adopter" className={styles.primaryCta}>
                            Get Pro free for life
                        </Link>
                    </article>
                </div>
            </section>

            <section className={styles.comparisonSection} aria-labelledby="comparison-title">
                <div className={styles.sectionHeading}>
                    <span>At a glance</span>
                    <h2 id="comparison-title">Free and Pro, side by side.</h2>
                </div>
                <div className={styles.tableShell}>
                    <table className={styles.comparisonTable}>
                        <thead>
                            <tr>
                                <th scope="col">Feature</th>
                                <th scope="col">Free</th>
                                <th scope="col" className={styles.proColumn}>Pro</th>
                            </tr>
                        </thead>
                        <tbody>
                            {PRICING_COMPARISON.map((row) => (
                                <tr key={row.label}>
                                    <th scope="row">{row.label}</th>
                                    <td>{row.free}</td>
                                    <td className={styles.proColumn}>
                                        {row.label === 'Platform subscription' ? (
                                            <span className={styles.tablePromotion}>
                                                <s>{regularPrice} / month</s>
                                                <strong>S$0.00 / month, limited time</strong>
                                            </span>
                                        ) : row.pro}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className={styles.tableNote}>
                    {isYearly
                        ? `The regular Pro yearly rate is ${PRO_YEARLY_TOTAL}, equivalent to ${PRO_YEARLY_MONTHLY_PRICE} per month.`
                        : `The regular Pro month-to-month rate is ${PRO_MONTHLY_PRICE} per month.`}{' '}
                    Approved early adopters pay S$0.00 for the platform subscription. Transaction fees still apply.
                </p>
            </section>
        </>
    );
}
