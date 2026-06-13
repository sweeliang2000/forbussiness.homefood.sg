import PaymentTypesAndFees from './PaymentTypesAndFees';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Payment Types & Fees | Collbine for Business',
  description:
    'Compare Collbine payment options, platform fees, Manual PayNow screenshot verification, automatic PayNow, card payments and supported digital wallets.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://forbusiness.collbine.com/payment-types-and-fees' },
};

const Page = () => {
  return <PaymentTypesAndFees />;
};

export default Page;
