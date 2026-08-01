import Login from './login';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Login | HomeFood for Business',
  description:
    'Access your HomeFood for Business login to manage your loyalty program, track customer engagement, and grow rewards in Singapore from one platform.',
  keywords: [
    'HomeFood for Business login',
    'business account login',
    'Singapore loyalty program',
    'merchant dashboard',
    'rewards management',
    'customer engagement tools',
    'loyalty program management',
  ],
  openGraph: {
    title: 'Login | HomeFood for Business',
    description:
      'Access your HomeFood for Business login to manage your loyalty program, track customer engagement, and grow rewards in Singapore from one platform.',
    url: 'https://business.homefood.sg/login',
    siteName: 'HomeFood for Business',
    images: [
      {
        url: 'https://business.homefood.sg/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Login | HomeFood for Business',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Login | HomeFood for Business',
    description:
      'Access your HomeFood for Business login to manage your loyalty program, track customer engagement, and grow rewards in Singapore from one platform.',
    images: ['https://business.homefood.sg/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://business.homefood.sg/login' },
};

const Page = () => {
    return <Login />;
};

export default Page;