import SignupViews from './signup-views/signup-views';

// Meta Data Explaination:
// 1. title: Optimized for SEO with action-oriented phrases.
// 2. description: Clear value proposition and targeting of Singapore merchants.
// 3. keywords: Helps in ranking for relevant search terms
// 4. Open Graph (og) Metadata: Enhances sharing previews on platforms like Facebook and LinkedIn.
// 5. Twitter Metadata: Optimized for Twitter card previews.
// 6. Image URL: Placeholder added for future branding consistency.
export const metadata = {
    title: 'Create an Account | HomeFood for Business - Loyalty Program in Singapore',
    description: 'Join HomeFood for Business today and create your own customizable loyalty program. Enhance customer engagement with tailored rewards and point systems, exclusively designed for Singapore merchants.',
    keywords: 'HomeFood, business loyalty program, rewards system Singapore, customer engagement, merchant loyalty tools, point system',
    author: 'HomeFood Team',
    og: {
        title: 'Create an Account | HomeFood for Business',
        description: 'Design and launch your business\'s unique loyalty program with HomeFood. Empower your shop with flexible rewards tailored for your customers.',
        type: 'website',
        url: 'https://business.homefood.sg/signup',
        image: 'https://business.homefood.sg/images/example.png',
    },
    twitter: {
        card: 'summary_large_image',
        site: '@HomeFood',
        title: 'Create an Account | HomeFood for Business',
        description: 'Join HomeFood for Business today and elevate your customer loyalty with a flexible rewards system tailored for Singapore merchants.',
        image: 'https://business.homefood.sg/images/example.png',
    },
};

const Signup = () => {
    return (
        <SignupViews/>
    )
};

export default Signup