export const FREE_PLAN = {
    name: 'Free',
    price: 'S$0',
    cadence: '/ month',
    description: 'A straightforward way to start selling without a platform subscription.',
    features: [
        'PayNow & PayLah!: 6% per transaction',
        'Visa & Mastercard: 8% + S$0.50 per transaction',
        'HomeFood ads appear on your public shop-details page',
        'Not eligible for Homebase Verified',
    ],
};

export const PRO_PLAN = {
    name: 'Pro',
    price: 'S$39.90',
    cadence: '/ month, billed yearly',
    description: 'Lower transaction fees and a more trusted, distraction-free storefront.',
    features: [
        'PayNow & PayLah!: 3% per transaction',
        'Visa & Mastercard: 6% + S$0.50 per transaction',
        'Ad-free public shop-details page',
        'Eligible for Homebase Verified after verification',
    ],
};

export const PRICING_COMPARISON = [
    {
        label: 'Platform subscription',
        free: 'S$0 / month',
        pro: 'S$39.90 / month',
    },
    {
        label: 'PayNow & PayLah!',
        free: '6%',
        pro: '3%',
    },
    {
        label: 'Visa & Mastercard',
        free: '8% + S$0.50',
        pro: '6% + S$0.50',
    },
    {
        label: 'Ads on public shop details',
        free: 'Shown',
        pro: 'No ads',
    },
    {
        label: 'Homebase Verified eligibility',
        free: 'Not included',
        pro: 'Eligible',
    },
];

export const EARLY_ADOPTER_SAVINGS = 'S$478.80';

export const PRO_YEARLY_MONTHLY_PRICE = 'S$39.90';
export const PRO_YEARLY_TOTAL = 'S$478.80';
export const PRO_MONTHLY_PRICE = 'S$47.88';
