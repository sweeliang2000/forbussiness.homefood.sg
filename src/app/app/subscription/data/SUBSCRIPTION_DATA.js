// Base monthly price for 1 outlet
const BASE_MONTHLY_PRICE = 79.99;

// Helper to build a subscription plan with correct pricing
const buildPlan = ({
    name,
    lookupKey,
    monthlyMultiplier,
    isYearly,
    outletsLabel,
    maxUsers,
    description,
}) => {
    const monthlyPrice = BASE_MONTHLY_PRICE * monthlyMultiplier;
    const price = isYearly ? monthlyPrice * 11 : monthlyPrice; // Yearly = 11 months charged (1 month free)

    return {
        name,
        lookup_key: lookupKey,
        price: Number(price.toFixed(2)),
        interval: isYearly ? 'year' : 'month',
        features: [
            { name: outletsLabel, included: true },
            { name: `Max of ${maxUsers} users`, included: true },
            { name: "Scan to win", included: true },
            { name: "Stamp Loyalty Card", included: true },
            { name: "Console management access", included: true },
            { name: "Analytics", included: true },
            { name: "Priority Support", included: monthlyMultiplier > 1 },
            { name: "Custom Integration Support", included: monthlyMultiplier >= 3 }
        ],
        description,
    };
};

export const SUBSCRIPTION_DATA = [
    // ============================
    // MONTHLY PLANS
    // ============================
    buildPlan({
        name: "1 Outlet (Monthly)",
        lookupKey: "1_outlets",
        monthlyMultiplier: 1, // 79.99
        isYearly: false,
        outletsLabel: "1 Outlet",
        maxUsers: 3,
        description: "Perfect for single-outlet businesses getting started with Collbine.",
    }),
    buildPlan({
        name: "2–3 Outlets (Monthly)",
        lookupKey: "2-3_outlets",
        monthlyMultiplier: 2, // 79.99 × 2 = 159.98
        isYearly: false,
        outletsLabel: "2–3 Outlets",
        maxUsers: 9,
        description: "For merchants managing 2–3 outlets with shared analytics and team access.",
    }),
    buildPlan({
        name: "4–6 Outlets (Monthly)",
        lookupKey: "4-6_outlets",
        monthlyMultiplier: 4, // 79.99 × 4 = 319.96
        isYearly: false,
        outletsLabel: "4–6 Outlets",
        maxUsers: 18,
        description: "Designed for growing brands running 4–6 outlets with advanced needs.",
    }),

    // ============================
    // YEARLY PLANS (11 MONTHS CHARGED)
    // ============================
    buildPlan({
        name: "1 Outlet (Yearly)",
        lookupKey: "1_outlets_yearly",
        monthlyMultiplier: 1, // 79.99 × 11 = 879.89
        isYearly: true,
        outletsLabel: "1 Outlet",
        maxUsers: 3,
        description: "Save with a yearly plan for your single outlet (1 month free).",
    }),
    buildPlan({
        name: "2–3 Outlets (Yearly)",
        lookupKey: "2-3_outlets_yearly",
        monthlyMultiplier: 2, // 159.98 × 11 = 1,759.78
        isYearly: true,
        outletsLabel: "2–3 Outlets",
        maxUsers: 9,
        description: "Best value for 2–3 outlets on annual billing (1 month free).",
    }),
    buildPlan({
        name: "4–6 Outlets (Yearly)",
        lookupKey: "4-6_outlets_yearly",
        monthlyMultiplier: 4, // 319.96 × 11 = 3,519.56
        isYearly: true,
        outletsLabel: "4–6 Outlets",
        maxUsers: 18,
        description: "Enterprise-style savings for 4–6 outlets with yearly billing (1 month free).",
    }),
];
