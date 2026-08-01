import type { Metadata } from 'next';
import NotificationsView from './notifications';

export const metadata: Metadata = {
  title: 'Notifications | HomeFood for Business',
  description:
    'Stay on top of HomeFood for Business notifications with release updates, app alerts, subscription reminders, and activity summaries in one place.',
  keywords: [
    'HomeFood for Business notifications',
    'app updates',
    'release announcements',
    'merchant dashboard',
    'subscription alerts',
    'loyalty platform',
    'business activity alerts',
  ],
  openGraph: {
    title: 'Notifications | HomeFood for Business',
    description:
      'Stay on top of HomeFood for Business notifications with release updates, app alerts, subscription reminders, and activity summaries in one place.',
    url: 'https://business.homefood.sg/app/notifications',
    siteName: 'HomeFood for Business',
    images: [
      {
        url: 'https://business.homefood.sg/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HomeFood for Business Notifications',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Notifications | HomeFood for Business',
    description:
      'Stay on top of HomeFood for Business notifications with release updates, app alerts, subscription reminders, and activity summaries in one place.',
    images: ['https://business.homefood.sg/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://business.homefood.sg/app/notifications' },
};

export default function NotificationsPage() {
  return <NotificationsView />;
}

