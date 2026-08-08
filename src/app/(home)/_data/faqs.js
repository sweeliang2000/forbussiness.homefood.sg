/**
 * Single source of truth for merchant FAQs.
 *
 * The home page shows the entries marked `featured`; /faq shows everything,
 * grouped by category. Keeping one list means the two can never drift into
 * giving different answers to the same question.
 */

export const FAQ_CATEGORIES = [
  { id: 'getting-started', label: 'Getting started' },
  { id: 'payments', label: 'Payments & fees' },
  { id: 'payouts', label: 'Payouts & refunds' },
  { id: 'orders', label: 'Orders & pickup' },
  { id: 'plans', label: 'Plans & billing' },
  { id: 'account', label: 'Your account' },
];

export const FAQS = [
  // ---------- Getting started ----------
  {
    category: 'getting-started',
    featured: true,
    question: 'Do I need a commercial kitchen or license?',
    answer:
      "HomeFood is built for home-based food (HBF) sellers operating within SFA's HBF guidelines. You don't need a commercial kitchen, but you're responsible for meeting the usual HBF food safety requirements — same as you would on WhatsApp or Instagram today.",
  },
  {
    category: 'getting-started',
    featured: true,
    question: 'Do I need a POS or card reader?',
    answer:
      'No hardware at all. Customers pay on their own phone when they order. Your "terminal" is just the HomeFood merchant app on any phone or laptop — you see incoming orders, mark them "almost ready" and "ready", and that\'s it.',
  },
  {
    category: 'getting-started',
    question: 'How long does it take to get set up?',
    answer:
      'Most sellers are live the same day. You add your shop details, build your menu, set your ordering hours and collection address, then publish. Nothing goes live to customers until you publish it yourself.',
  },
  {
    category: 'getting-started',
    question: 'Can I try it before publishing to customers?',
    answer:
      'Yes. Your shop stays unpublished while you set it up, and you can use the terminal to walk through an order end to end before anyone can find you.',
  },

  // ---------- Payments & fees ----------
  {
    category: 'payments',
    featured: true,
    question: 'How do the payment fees actually work?',
    answer:
      "Pro includes Manual PayNow at 0%. For automatic payments on Pro, PayNow / PayLah! is 3%, and Visa / Mastercard is 6% + S$0.50. Manual PayNow is not available on Free; its automatic rates are 6% for PayNow / PayLah! and 8% + S$0.50 for cards. Fees are deducted automatically before payout, except Manual PayNow payments, which sellers verify directly.",
  },
  {
    category: 'payments',
    question: 'Which payment methods can customers use?',
    answer:
      'PayNow, PayLah!, Visa, and Mastercard. Customers pay on their own phone when they place the order, so no money changes hands at your door.',
  },
  {
    category: 'payments',
    question: 'What is the difference between Manual and Automatic PayNow?',
    answer:
      'With Automatic PayNow the payment is collected and reconciled for you, and the fee is deducted before payout. With Manual PayNow the customer transfers to you directly and you verify the payment yourself — which is why it carries no platform fee, and why it is only available on Pro.',
  },
  {
    category: 'payments',
    question: 'Do I ever handle card details?',
    answer:
      'No. Card payments are processed by Stripe and card numbers never reach HomeFood or you. See our privacy policy for how payment data is handled.',
  },

  // ---------- Payouts & refunds ----------
  {
    category: 'payouts',
    featured: true,
    question: 'When do I actually get paid?',
    answer:
      'Your earnings build up in your HomeFood balance as orders complete. You can withdraw once a month to your linked bank account. Every payout comes with an itemised statement showing orders, fees, and any refunds.',
  },
  {
    category: 'payouts',
    featured: true,
    question: 'What if a customer asks for a refund?',
    answer:
      "Route the refund request through us. Our team reviews it, handles any card chargeback admin, and settles it directly — so you're not chasing the customer or your bank. You just see the adjustment on your next payout statement.",
  },
  {
    category: 'payouts',
    question: 'What happens if a customer never collects their order?',
    answer:
      'Mark the order as it actually ended in the terminal. Uncollected orders are treated case by case — send it to us and we will review it with the payment record rather than leaving you to argue it out with the customer.',
  },
  {
    category: 'payouts',
    question: 'Where do I see what I have earned?',
    answer:
      'Your dashboard shows completed orders and the balance building up. Each payout statement itemises the orders it covers, the fees deducted, and any refunds applied.',
  },

  // ---------- Orders & pickup ----------
  {
    category: 'orders',
    question: 'How do pre-orders work?',
    answer:
      'You set the dates you cook, how many slots each date has, and when ordering closes. Customers order ahead for a specific date, so you cook to a number you already know instead of guessing.',
  },
  {
    category: 'orders',
    question: 'Can I close a specific date or change my quota for one day?',
    answer:
      'Yes. Your ordering calendar lets you close individual dates or override the quota for a single day without touching your normal schedule. If a date already has pre-orders, you are warned before closing it.',
  },
  {
    category: 'orders',
    question: 'What does the customer see while they wait?',
    answer:
      'They see the order move through received, cooking, almost ready, and ready. They are notified when it is nearly ready and again when it is ready to collect, so they arrive at the right time rather than waiting at your door.',
  },
  {
    category: 'orders',
    question: 'Can I sell out an item during the day?',
    answer:
      'Yes. You can mark an item — or a single option within an item — sold out from the terminal, either for the rest of the day or until you turn it back on.',
  },

  // ---------- Plans & billing ----------
  {
    category: 'plans',
    featured: true,
    question: 'Will the platform really stay free?',
    answer:
      'Yes. Eligible Founding Sellers are grandfathered into a S$0 monthly platform membership for the lifetime of their HomeFood account. Standard transaction fees still apply. Places are intentionally limited to our founding cohort so we can onboard and support each seller properly.',
  },
  {
    category: 'plans',
    question: 'What does Pro cost if I am not a Founding Seller?',
    answer:
      'Pro is S$47.88 per month, or S$478.80 per year. The yearly plan works out cheaper than paying monthly. Transaction fees are separate and are listed on our pricing page.',
  },
  {
    category: 'plans',
    question: 'Can I switch between monthly and yearly, or cancel?',
    answer:
      'Yes, both from the billing portal in your dashboard. Cancellations take effect at the end of the period you have already paid for, so you keep Pro until then.',
  },
  {
    category: 'plans',
    question: 'What happens to my shop if I downgrade?',
    answer:
      'Your shop, menu, and order history stay put. You lose the Pro-only features — most notably Manual PayNow at 0% — and your automatic payment rates revert to the Free tier rates.',
  },

  // ---------- Your account ----------
  {
    category: 'account',
    question: 'Can I add staff to help run my shop?',
    answer:
      'Yes. You can invite people as Manager or Operator. Only the Owner can change billing or connect the payout account, which keeps money settings with the person who owns the business.',
  },
  {
    category: 'account',
    question: 'Is my collection address shown publicly?',
    answer:
      'Your collection address is shown to customers who order from you, since they need to know where to collect. Think about what you publish, and contact us if you need to change how your address appears.',
  },
  {
    category: 'account',
    question: 'How do I close my account?',
    answer:
      'Email us and we will walk you through it. We keep the records we are legally required to keep — orders, invoices, and payouts — and remove the rest.',
  },
];

export const FEATURED_FAQS = FAQS.filter((faq) => faq.featured);
