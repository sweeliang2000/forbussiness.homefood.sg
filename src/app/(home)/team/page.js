import Team from './Team';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Our Team | HomeFood for Business',
  description:
    'Meet the team behind HomeFood — a product of Collbine Pte. Ltd., building tools for home-based food businesses in Singapore.',
  keywords: ['HomeFood team', 'Collbine Pte Ltd', 'HomeFood founders', 'Singapore startup team'],
  openGraph: {
    title: 'Our Team | HomeFood for Business',
    description:
      'Meet the team behind HomeFood — a product of Collbine Pte. Ltd., building tools for home-based food businesses in Singapore.',
    url: 'https://business.homefood.sg/team',
    siteName: 'HomeFood for Business',
    type: 'website',
    locale: 'en_SG',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://business.homefood.sg/team' },
};

const Page = () => {
  return <Team />;
};

export default Page;
