import EarlyAdopter from './EarlyAdopter';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Get Pro Free for Life | HomeFood Early Adopters',
  description:
    'Apply as a HomeFood early adopter and receive the S$39.90/month Pro platform subscription free for life. Payment transaction fees still apply.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://business.homefood.sg/early-adopter' },
};

const Page = () => {
  return <EarlyAdopter />;
};

export default Page;
