import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  // Standalone project (own package.json + lockfile), not part of any npm
  // workspace -- pin the tracing root so Next never guesses a wrong
  // monorepo root (lesson learned on NouvellesDuPays and reapplied here).
  outputFileTracingRoot: __dirname,
};

export default withNextIntl(nextConfig);
