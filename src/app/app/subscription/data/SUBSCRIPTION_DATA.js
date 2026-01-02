export const SUBSCRIPTION_DATA = [
    // ============================
    // 1 OUTLET – FREE PLAN
    // ============================
    {
        name: "1 Outlet",
        lookup_key: "plan_1_outlet_free",
        price: 0,
        features: [
            { name: "1 Outlet", included: true },
            { name: "Max of 3 users", included: true },
            { name: "Release to app", included: true },
            { name: "Console management access", included: true },
            { name: "Loyalty System (e.g., stamp)", included: true },
            { name: "Analytics", included: false },
            { name: "Priority Support", included: false },
            { name: "Custom Integration Support", included: false }
        ],
        description: "A perfect starter plan for new businesses trying out Collbine."
    },

    // ============================
    // 1 OUTLET + ANALYTICS
    // ============================
    {
        name: "1 Outlet with Analytics",
        lookup_key: "plan_1_outlet",
        price: 29.99,   // Analytics add-on
        features: [
            { name: "1 Outlet", included: true },
            { name: "Max of 3 users", included: true },
            { name: "Release to app", included: true },
            { name: "Console management access", included: true },
            { name: "Loyalty System (e.g., stamp)", included: true },
            { name: "Analytics", included: true },
            { name: "Priority Support", included: false },
            { name: "Custom Integration Support", included: false }
        ],
        description: "Ideal for single-outlet merchants who need analytics to grow faster."
    },

    // ============================
    // OUTLET PLANS 2 – 10
    // ============================
    ...Array.from({ length: 9 }, (_, i) => {
        const outlets = i + 2;                   // 2 → 10
        const price = (outlets - 1) * 59.99;     // Only 1 free

        return {
            name: `${outlets} Outlets`,
            lookup_key: `plan_${outlets}_outlets`,
            price: Number(price.toFixed(2)),
            features: [
                { name: `${outlets} Outlets`, included: true },
                { name: `Max of ${outlets * 3} users`, included: true },
                { name: "Release to app", included: true },
                { name: "Console management access", included: true },
                { name: "Loyalty System (e.g., stamp)", included: true },
                { name: "Analytics", included: true },
                { name: "Priority Support", included: outlets >= 2 },
                { name: "Custom Integration Support", included: outlets >= 5 }
            ],
            description:
                outlets < 5
                    ? "Built for growing businesses managing multiple outlets with analytics and team access."
                    : "Enterprise-ready plan designed for multi-branch businesses requiring integrations and scaling."
        };
    })
];
