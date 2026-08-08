import Privacy from './Privacy';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Privacy Policy | HomeFood for Business',
  description:
    'How Collbine Pte. Ltd. collects, uses, and protects merchant personal data on HomeFood for Business. PDPA-aligned privacy policy for business.homefood.sg.',
  openGraph: {
    title: 'Privacy Policy | HomeFood for Business',
    description:
      'How Collbine Pte. Ltd. collects, uses, and protects merchant personal data. PDPA-aligned.',
    url: 'https://business.homefood.sg/privacy',
    siteName: 'HomeFood for Business',
    type: 'website',
    locale: 'en_SG',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://business.homefood.sg/privacy' },
};

const Page = () => {
  return <Privacy />;
};

export default Page;
