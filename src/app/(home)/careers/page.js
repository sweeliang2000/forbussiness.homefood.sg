import Careers from './Careers';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Careers | HomeFood for Business',
  description:
    'There are no open roles at HomeFood right now. Tell us what you would want to work on and we will get in touch when something opens up.',
  keywords: ['HomeFood careers', 'Collbine Pte Ltd jobs', 'startup jobs Singapore'],
  openGraph: {
    title: 'Careers | HomeFood for Business',
    description:
      'There are no open roles at HomeFood right now. Tell us what you would want to work on and we will get in touch when something opens up.',
    url: 'https://business.homefood.sg/careers',
    siteName: 'HomeFood for Business',
    type: 'website',
    locale: 'en_SG',
  },
  // No roles listed, so there is nothing here worth surfacing in job search
  // results — but the page should still be reachable and indexed.
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://business.homefood.sg/careers' },
};

const Page = () => {
  return <Careers />;
};

export default Page;
