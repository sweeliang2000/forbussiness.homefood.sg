import RefundPolicy from './RefundPolicy';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Merchant Refund & Payment Policy | HomeFood for Business',
  description:
    'How refunds and payment processing fees work on HomeFood — manual PayNow, automatic PayNow, card, Apple Pay, Google Pay and other digital payments, plus refund processing timelines.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://business.homefood.sg/refund-policy' },
};

const Page = () => {
  return <RefundPolicy />;
};

export default Page;
