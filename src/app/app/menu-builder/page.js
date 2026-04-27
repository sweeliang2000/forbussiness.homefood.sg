import MenuBuilder from './MenuBuilder';

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Menu Builder | Collbine for Business',
  description:
    'Build your in-app menu: categories, items, pricing rules, variants, add-ons, and customer menu preview.',
  robots: { index: true, follow: true },
};

export default function Page() {
  return <MenuBuilder />;
}

