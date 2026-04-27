import EarlyAdopter from './EarlyAdopter';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Join Early Adopters | Collbine for Business',
  description:
    'Be among the first home-based food sellers in Singapore to get set up on Collbine. Join the waitlist and we\'ll reach out when we\'re ready for you.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://forbusiness.collbine.com/early-adopter' },
};

const Page = () => {
  return <EarlyAdopter />;
};

export default Page;
