import Login from './login';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Login | HomeFood for Business',
  description:
    'Log in to HomeFood for Business to manage your menu, take orders and pre-orders, and handle home pickup from one place.',
  keywords: [
    'HomeFood for Business login',
    'business account login',
    'home based food Singapore',
    'merchant dashboard',
    'order management',
    'pre-order system',
    'home pickup orders',
  ],
  openGraph: {
    title: 'Login | HomeFood for Business',
    description:
      'Log in to HomeFood for Business to manage your menu, take orders and pre-orders, and handle home pickup from one place.',
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
      'Log in to HomeFood for Business to manage your menu, take orders and pre-orders, and handle home pickup from one place.',
    images: ['https://business.homefood.sg/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://business.homefood.sg/login' },
};

const Page = () => {
    return <Login />;
};

export default Page;