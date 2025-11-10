import Login from './login';

// Meta Data Explanation:
// 1. title: Optimized for SEO with action-oriented phrases.
// 2. description: Clear value proposition and targeting of Singapore merchants.
// 3. keywords: Helps in ranking for relevant search terms
// 4. Open Graph (og) Metadata: Enhances sharing previews on platforms like Facebook and LinkedIn.
// 5. Twitter Metadata: Optimized for Twitter card previews.
// 6. Image URL: Placeholder added for future branding consistency.
export const metadata = {
    title: 'Login to Your Business Account | Collbine for Business - Loyalty Program in Singapore',
    description: 'Login to Collbine for Business to manage your loyalty program. Access your dashboard to track customer engagement, manage rewards, and grow your business in Singapore.',
    keywords: 'Collbine login, business loyalty program login, rewards system Singapore, merchant dashboard, customer engagement tools, loyalty program management',
    author: 'Collbine Team',
    og: {
        title: 'Login to Your Business Account | Collbine for Business',
        description: 'Access your Collbine for Business dashboard to manage your loyalty program, track customer engagement, and grow your business with flexible rewards.',
        type: 'website',
        url: 'https://www.collbine.com/login',
        image: 'https://www.collbine.com/images/example.png',
    },
    twitter: {
        card: 'summary_large_image',
        site: '@Collbine',
        title: 'Login to Your Business Account | Collbine for Business',
        description: 'Login to Collbine for Business and manage your loyalty program dashboard. Track customer engagement and grow your business with tailored rewards.',
        image: 'https://www.collbine.com/images/example.png',
    },
};

const Page = () => {
    return <Login />;
};

export default Page;