import ForgotPassword from './forgot-password';

export const metadata = {
    // The title that appears in the browser tab and is crucial for SEO. 
    // Should be concise, action-oriented, and include relevant keywords for better ranking.
    title: 'Reset Your Password | Collbine - Loyalty Program for Businesses in Singapore',

    // A brief description of the page's content, optimized for search engines. 
    // It appears in search engine results and should be enticing and informative.
    description: 'Forgot your password? Reset it now and regain access to your Collbine account, designed exclusively for Singapore merchants.',

    // A list of keywords relevant to the page's purpose. 
    // Helps search engines associate your page with specific search terms.
    keywords: 'reset password, forgot password, Collbine account recovery, business loyalty program, Singapore merchants, password help',

    // The canonical URL ensures that search engines know the primary URL for this page, 
    // preventing duplicate content issues and consolidating SEO rankings.
    canonical: 'https://www.collbine.com/forgot-password',

    // Meta tags provide additional information to search engines and browsers.
    meta: {
        // 'robots' tells search engines whether to index the page and follow links.
        robots: 'index, follow',
        // Ensures the page is responsive by setting the viewport for mobile and desktop devices.
        viewport: 'width=device-width, initial-scale=1.0',
        // Specifies the character encoding for the page.
        charset: 'UTF-8',
    },

    // Open Graph metadata enhances how your page appears when shared on platforms like Facebook or LinkedIn.
    og: {
        // Title of the page for social media sharing.
        title: 'Reset Your Password | Collbine - Loyalty Program for Businesses',
        // Description that will appear under the title when shared on social media.
        description: 'Forgot your password? Reset it now and get back to managing your business\'s loyalty program with ease on Collbine.',
        // Specifies the type of content (e.g., website, article).
        type: 'website',
        // The URL of the page being shared.
        url: 'https://www.collbine.com/forgot-password',
        // An image used for a visual preview when the page is shared.
        image: 'https://www.collbine.com/images/reset-password-example.png',
    },

    // Twitter metadata optimizes how the page appears in Twitter card previews.
    twitter: {
        // Specifies the type of Twitter card (e.g., summary, summary_large_image).
        card: 'summary_large_image',
        // Twitter handle of the site or company.
        site: '@Collbine',
        // Title for the Twitter card preview.
        title: 'Reset Your Password | Collbine for Businesses',
        // Description that appears on the Twitter card.
        description: 'Easily reset your password and regain access to Collbine\'s loyalty program for businesses in Singapore. Quick and secure account recovery.',
        // Image displayed on the Twitter card.
        image: 'https://www.collbine.com/images/reset-password-example.png',
    },

    // Structured data (JSON-LD) helps search engines understand the content and context of your page.
    structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        // The name/title of the page.
        'name': 'Reset Password | Collbine',
        // A brief description of the page's purpose.
        'description': 'Easily reset your Collbine account password and regain access to your loyalty program.',
        // The URL of the page.
        'url': 'https://www.collbine.com/forgot-password',
        // Information about the publisher (organization or company).
        'publisher': {
            '@type': 'Organization',
            'name': 'Collbine',
            'logo': {
                '@type': 'ImageObject',
                'url': 'https://www.collbine.com/images/logo.png',
            },
        },
    },

    // Breadcrumb schema improves SEO and user navigation by showing the page's position in the site hierarchy.
    breadcrumbs: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {
                // The first breadcrumb item (e.g., Home).
                '@type': 'ListItem',
                'position': 1,
                'name': 'Home',
                'item': 'https://www.collbine.com',
            },
            {
                // The second breadcrumb item (e.g., Forgot Password).
                '@type': 'ListItem',
                'position': 2,
                'name': 'Forgot Password',
                'item': 'https://www.collbine.com/forgot-password',
            },
        ],
    },
};


const Page = () => {
    return <ForgotPassword/>
};

export default Page;