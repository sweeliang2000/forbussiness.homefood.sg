import About from './About';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'About HomeFood | HomeFood for Business',
  description:
    'HomeFood is built by Collbine Pte. Ltd. in Singapore to help home-based food businesses get discovered, take pre-orders, and get paid online.',
  keywords: [
    'about HomeFood',
    'Collbine Pte Ltd',
    'home based food Singapore',
    'HomeFood team',
    'Singapore home kitchen platform',
  ],
  openGraph: {
    title: 'About HomeFood | HomeFood for Business',
    description:
      'HomeFood is built by Collbine Pte. Ltd. in Singapore to help home-based food businesses get discovered, take pre-orders, and get paid online.',
    url: 'https://business.homefood.sg/about',
    siteName: 'HomeFood for Business',
    type: 'website',
    locale: 'en_SG',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://business.homefood.sg/about' },
};

const Page = () => {
  return <About />;
};

export default Page;
