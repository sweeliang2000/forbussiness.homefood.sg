/**
 * next-sitemap configuration.
 *
 * - `siteUrl` MUST be the public production URL of your app.
 * - Set `NEXT_PUBLIC_SITE_URL` in your environment before running `next build`.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000';

module.exports = {
  siteUrl,
  generateRobotsTxt: true,
};

