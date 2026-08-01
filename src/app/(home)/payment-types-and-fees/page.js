import PaymentTypesAndFees from './PaymentTypesAndFees';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Payment Types & Fees | HomeFood for Business',
  description:
    'Compare HomeFood payment options, platform fees, Manual PayNow screenshot verification, automatic PayNow, card payments and supported digital wallets.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://business.homefood.sg/payment-types-and-fees' },
};

const Page = () => {
  return <PaymentTypesAndFees />;
};

export default Page;
