import type { Metadata } from 'next';
import NotificationsView from './notifications';

export const metadata: Metadata = {
  title: 'Notifications | Collbine for Business',
  description:
    'Stay on top of Collbine for Business notifications with release updates, app alerts, subscription reminders, and activity summaries in one place.',
  keywords: [
    'Collbine for Business notifications',
    'app updates',
    'release announcements',
    'merchant dashboard',
    'subscription alerts',
    'loyalty platform',
    'business activity alerts',
  ],
  openGraph: {
    title: 'Notifications | Collbine for Business',
    description:
      'Stay on top of Collbine for Business notifications with release updates, app alerts, subscription reminders, and activity summaries in one place.',
    url: 'https://forbusiness.collbine.com/app/notifications',
    siteName: 'Collbine for Business',
    images: [
      {
        url: 'https://forbusiness.collbine.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Collbine for Business Notifications',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Notifications | Collbine for Business',
    description:
      'Stay on top of Collbine for Business notifications with release updates, app alerts, subscription reminders, and activity summaries in one place.',
    images: ['https://forbusiness.collbine.com/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://forbusiness.collbine.com/app/notifications' },
};

export default function NotificationsPage() {
  return <NotificationsView />;
}

