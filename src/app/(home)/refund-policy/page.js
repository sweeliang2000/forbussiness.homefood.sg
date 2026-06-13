import RefundPolicy from './RefundPolicy';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Merchant Refund & Payment Policy | Collbine for Business',
  description:
    'How refunds and payment processing fees work on Collbine — manual PayNow, automatic PayNow, card, Apple Pay, Google Pay and other digital payments, plus refund processing timelines.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://forbusiness.collbine.com/refund-policy' },
};

const Page = () => {
  return <RefundPolicy />;
};

export default Page;
