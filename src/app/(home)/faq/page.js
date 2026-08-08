import FAQ from './FAQ';
import { FAQS } from '../_data/faqs';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'FAQ | HomeFood for Business',
  description:
    'Answers for home-based food sellers on HomeFood — fees, payouts, refunds, pre-orders, plans, and accounts. Search the questions or contact us directly.',
  keywords: [
    'HomeFood FAQ',
    'home based food seller questions',
    'HomeFood fees',
    'HomeFood payouts',
    'Singapore home kitchen platform',
  ],
  openGraph: {
    title: 'FAQ | HomeFood for Business',
    description:
      'Answers for home-based food sellers on HomeFood — fees, payouts, refunds, pre-orders, plans, and accounts.',
    url: 'https://business.homefood.sg/faq',
    siteName: 'HomeFood for Business',
    type: 'website',
    locale: 'en_SG',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://business.homefood.sg/faq' },
};

// Served as FAQPage structured data so the answers can surface directly in
// search results rather than only as a link to this page.
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: { '@type': 'Answer', text: faq.answer },
  })),
};

const Page = () => {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FAQ />
    </>
  );
};

export default Page;
