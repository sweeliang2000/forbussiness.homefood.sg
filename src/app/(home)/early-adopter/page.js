import EarlyAdopter from './EarlyAdopter';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Apply as a Founding Seller | HomeFood.sg',
  description:
    'Apply as a HomeFood.sg Founding Seller for free membership for life, launch support, a permanent badge and free onboarding. Transaction fees still apply.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://business.homefood.sg/early-adopter' },
};

const Page = () => {
  return <EarlyAdopter />;
};

export default Page;
