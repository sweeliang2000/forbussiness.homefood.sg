/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['mui-color-input'],
    images: {
        // Update it when sample data is not used.
        domains: [
          "plus.unsplash.com", 
          "images.unsplash.com",
          "collbine-forbusiness-shop-images.s3.ap-southeast-1.amazonaws.com",
          "collbine-forbusiness-reward-images.s3.ap-southeast-1.amazonaws.com",
          "collbine-forbusiness-menus.s3.ap-southeast-1.amazonaws.com",
          "d2n23ozk9atrac.cloudfront.net"
        ],
      },
};

export default nextConfig;
