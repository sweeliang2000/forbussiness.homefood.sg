import CardDesign from "./CardDesign";

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Custom Loyalty Card Design | Collbine for Business',
  description:
    'Design your custom loyalty card design for merchants: choose colours, stamp goals, and rewards in Collbine for Business. Start building your card today.',
  keywords: [
    'custom loyalty card design',
    'stamp loyalty card',
    'merchant loyalty program',
    'loyalty rewards',
    'stamp goals',
    'reward card design',
    'Collbine for Business',
  ],
  openGraph: {
    title: 'Custom Loyalty Card Design | Collbine for Business',
    description:
      'Design your custom loyalty card design for merchants: choose colours, stamp goals, and rewards in Collbine for Business. Start building your card today.',
    url: 'https://forbusiness.collbine.com/app/card-design',
    siteName: 'Collbine for Business',
    images: [
      {
        url: 'https://forbusiness.collbine.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Custom loyalty card design',
      },
    ],
    type: 'website',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Custom Loyalty Card Design | Collbine for Business',
    description:
      'Design your custom loyalty card design for merchants: choose colours, stamp goals, and rewards in Collbine for Business. Start building your card today.',
    images: ['https://forbusiness.collbine.com/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://forbusiness.collbine.com/app/card-design' },
};

const Page = () => {
    return(
        <CardDesign/>
    )
};

export default Page;