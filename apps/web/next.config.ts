import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  // Standalone project (own package.json + lockfile), not part of any npm
  // workspace -- pin the tracing root so Next never guesses a wrong
  // monorepo root (lesson learned on NouvellesDuPays and reapplied here).
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
  // Clean URL for the static delete-account.html page in public/ (shared
  // Tekeche backend integration, not an App Router page). middleware.ts
  // excludes this exact path from locale redirection so the rewrite below
  // actually gets a chance to run.
  async rewrites() {
    return [
      { source: '/delete-account', destination: '/delete-account.html' },
    ];
  },
};

export default withNextIntl(nextConfig);
