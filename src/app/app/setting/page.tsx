import type { Metadata } from 'next';
import AccountSetting from './AccountSetting/AccountSetting';

export const metadata: Metadata = {
  title: 'Settings | HomeFood for Business',
  description:
    'Manage your HomeFood for Business account settings, including profile, security, and subscription options. Update preferences and stay in control.',
  keywords: [
    'account settings',
    'HomeFood for Business',
    'change password',
    'security settings',
    'subscription management',
    'merchant account',
    'loyalty platform',
  ],
  openGraph: {
    title: 'Settings | HomeFood for Business',
    description:
      'Manage your HomeFood for Business account settings, including profile, security, and subscription options. Update preferences and stay in control.',
    url: 'https://business.homefood.sg/app/setting',
    siteName: 'HomeFood for Business',
    images: [
      {
        url: 'https://business.homefood.sg/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HomeFood for Business Settings',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Settings | HomeFood for Business',
    description:
      'Manage your HomeFood for Business account settings, including profile, security, and subscription options. Update preferences and stay in control.',
    images: ['https://business.homefood.sg/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://business.homefood.sg/app/setting' },
};

const PointsManagement = () => {
  return <AccountSetting />;
};

export default PointsManagement;

