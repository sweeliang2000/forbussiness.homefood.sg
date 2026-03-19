This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Packages Installed
- React Icons: https://www.npmjs.com/package/react-icons
- Mui material @emotion/react @emotion/styled

## Sitemap (next-sitemap + Search Console)
This project uses `next-sitemap` to generate `sitemap.xml` during `next build` (via the `postbuild` script).

Setup
1. Set `NEXT_PUBLIC_SITE_URL` to your production domain (example: `https://yourdomain.com`) before running `npm run build`.
2. Build the project (`npm run build`). After the build, `next-sitemap` generates `public/sitemap.xml` (served at `/sitemap.xml`).
3. In Google Search Console, submit the sitemap URL: `https://yourdomain.com/sitemap.xml`.

When new paths are created
- For new static routes (new folders/files under `src/app` without dynamic params), run a build and redeploy—`next-sitemap` will pick them up automatically.
- For new dynamic routes (folders like `[param]`, e.g. `.../release/history/[history_id]`), you must update `next-sitemap.config.js` to provide `additionalPaths` (so sitemap includes the real parameter values), then run a build and redeploy.
