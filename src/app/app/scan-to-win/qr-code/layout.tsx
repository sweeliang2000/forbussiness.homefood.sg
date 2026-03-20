import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Scan-to-Win QR Code Generator | Collbine for Business',
  description:
    'Generate your scan-to-win QR code for your poster. Create, name, and download QR codes so customers scan and earn rewards on Collbine for Business.',
  keywords: [
    'scan-to-win QR code',
    'Scan to Win rewards',
    'QR code generator',
    'merchant QR codes',
    'loyalty rewards for customers',
    'reward scanning',
    'Collbine for Business',
  ],
  openGraph: {
    title: 'Scan-to-Win QR Code Generator | Collbine for Business',
    description:
      'Generate your scan-to-win QR code for your poster. Create, name, and download QR codes so customers scan and earn rewards on Collbine for Business.',
    url: 'https://forbusiness.collbine.com/app/scan-to-win/qr-code',
    siteName: 'Collbine for Business',
    images: [
      {
        url: 'https://forbusiness.collbine.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Scan-to-Win QR Code Generator',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scan-to-Win QR Code Generator | Collbine for Business',
    description:
      'Generate your scan-to-win QR code for your poster. Create, name, and download QR codes so customers scan and earn rewards on Collbine for Business.',
    images: ['https://forbusiness.collbine.com/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://forbusiness.collbine.com/app/scan-to-win/qr-code',
  },
};

export default function ScanToWinQrCodeLayout({ children }: { children: ReactNode }) {
  return children;
}

