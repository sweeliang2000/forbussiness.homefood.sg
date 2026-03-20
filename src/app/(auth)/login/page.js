import Login from './login';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Login | Collbine for Business',
  description:
    'Access your Collbine for Business login to manage your loyalty program, track customer engagement, and grow rewards in Singapore from one platform.',
  keywords: [
    'Collbine for Business login',
    'business account login',
    'Singapore loyalty program',
    'merchant dashboard',
    'rewards management',
    'customer engagement tools',
    'loyalty program management',
  ],
  openGraph: {
    title: 'Login | Collbine for Business',
    description:
      'Access your Collbine for Business login to manage your loyalty program, track customer engagement, and grow rewards in Singapore from one platform.',
    url: 'https://forbusiness.collbine.com/login',
    siteName: 'Collbine for Business',
    images: [
      {
        url: 'https://forbusiness.collbine.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Login | Collbine for Business',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Login | Collbine for Business',
    description:
      'Access your Collbine for Business login to manage your loyalty program, track customer engagement, and grow rewards in Singapore from one platform.',
    images: ['https://forbusiness.collbine.com/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://forbusiness.collbine.com/login' },
};

const Page = () => {
    return <Login />;
};

export default Page;