import './globals.css';
import { Analytics } from '@vercel/analytics/next';
import AuthGuard from '@/components/AuthGuard/AuthGuard';
import ThemeRegistry from '@/theme/ThemeRegistry';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://business.homefood.sg'),
  title: 'HomeFood for Business | Customisable Rewards Systems in Singapore',
  description: 'HomeFood offers scan to win and loyalty system for Singapore merchants. Empower your business with a unique, flexible rewards program that allows customers to earn and redeem points, tailored to your shop\'s needs.',
  keywords: ['loyalty program', 'customer rewards', 'merchant solutions', 'Singapore business', 'CRM', 'customer engagement', 'points system', 'digital loyalty'],
  author: 'HomeFood Team',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'HomeFood for Business | Customisable Rewards Systems in Singapore',
    description: 'HomeFood offers scan to win and loyalty system for Singapore merchants. Empower your business with a unique, flexible rewards program that allows customers to earn and redeem points, tailored to your shop\'s needs.',
    url: 'https://business.homefood.sg',
    siteName: 'HomeFood for Business',
    images: [
      {
        url: '/android-chrome-512x512.png',
        width: 512,
        height: 512,
        alt: 'HomeFood for Business Logo',
      },
    ],
    locale: 'en_SG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@HomeFood',
    title: 'HomeFood for Business | Customisable Rewards Systems in Singapore',
    description: 'HomeFood offers scan to win and loyalty system for Singapore merchants. Empower your business with a unique, flexible rewards program.',
    images: ['/android-chrome-512x512.png'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <body>
        <ThemeRegistry>
          <AuthGuard>{children}</AuthGuard>
        </ThemeRegistry>
        <Analytics />
      </body>
    </html>
  );
}
