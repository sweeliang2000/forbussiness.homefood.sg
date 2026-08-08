import SignupViews from './signup-views/signup-views';

// Meta Data Explaination:
// 1. title: Optimized for SEO with action-oriented phrases.
// 2. description: Clear value proposition and targeting of Singapore merchants.
// 3. keywords: Helps in ranking for relevant search terms
// 4. Open Graph (og) Metadata: Enhances sharing previews on platforms like Facebook and LinkedIn.
// 5. Twitter Metadata: Optimized for Twitter card previews.
// 6. Image URL: Placeholder added for future branding consistency.
export const metadata = {
    title: 'Create an Account | HomeFood for Business',
    description: 'Create a HomeFood for Business account and start taking orders from your home kitchen — get discovered, take pre-orders, and get paid online.',
    keywords: 'HomeFood, home based food Singapore, home kitchen orders, pre-order system, online payment for home sellers, merchant signup',
    author: 'HomeFood Team',
    og: {
        title: 'Create an Account | HomeFood for Business',
        description: 'Create a HomeFood for Business account and start taking orders from your home kitchen.',
        type: 'website',
        url: 'https://business.homefood.sg/signup',
        image: 'https://business.homefood.sg/images/example.png',
    },
    twitter: {
        card: 'summary_large_image',
        site: '@HomeFood',
        title: 'Create an Account | HomeFood for Business',
        description: 'Create a HomeFood for Business account and start taking orders from your home kitchen.',
        image: 'https://business.homefood.sg/images/example.png',
    },
};

const Signup = () => {
    return (
        <SignupViews/>
    )
};

export default Signup