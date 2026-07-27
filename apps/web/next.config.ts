import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  // react-leaflet v4's MapContainer doesn't tolerate React 18 StrictMode's
  // dev-only double-effect-invocation cleanly -- Leaflet throws "Map
  // container is already initialized" on the second mount because the DOM
  // node's `_leaflet_id` isn't cleared before react-leaflet remounts it.
  // Dev-only behavior difference (StrictMode's double-invoke never runs in
  // production builds), not a runtime/production risk.
  reactStrictMode: false,
  // This app is intentionally NOT part of the root npm workspace (see
  // package.json comment) -- pin the tracing root explicitly so Next
  // never guesses the wrong monorepo root, same fix applied on
  // NouvellesDuPays after hitting this exact issue.
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }],
  },
};

export default withNextIntl(nextConfig);
