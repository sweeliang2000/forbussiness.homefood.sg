import type { Metadata } from 'next';
import AccountSetting from './AccountSetting/AccountSetting';

export const metadata: Metadata = {
  title: 'Settings | Collbine for Business',
  description:
    'Manage your Collbine for Business account settings, including profile, security, and subscription options. Update preferences and stay in control.',
  keywords: [
    'account settings',
    'Collbine for Business',
    'change password',
    'security settings',
    'subscription management',
    'merchant account',
    'loyalty platform',
  ],
  openGraph: {
    title: 'Settings | Collbine for Business',
    description:
      'Manage your Collbine for Business account settings, including profile, security, and subscription options. Update preferences and stay in control.',
    url: 'https://forbusiness.collbine.com/app/setting',
    siteName: 'Collbine for Business',
    images: [
      {
        url: 'https://forbusiness.collbine.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Collbine for Business Settings',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Settings | Collbine for Business',
    description:
      'Manage your Collbine for Business account settings, including profile, security, and subscription options. Update preferences and stay in control.',
    images: ['https://forbusiness.collbine.com/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://forbusiness.collbine.com/app/setting' },
};

const PointsManagement = () => {
  return <AccountSetting />;
};

export default PointsManagement;

