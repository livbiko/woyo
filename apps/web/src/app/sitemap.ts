import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';

const SITE_URL = 'https://woyo.ci';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/become-a-provider`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  try {
    const { items } = await api.searchBusinesses({ pageSize: 50 });
    const businessRoutes: MetadataRoute.Sitemap = items.map((b) => ({
      url: `${SITE_URL}/business/${b.slug}`,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));
    return [...staticRoutes, ...businessRoutes];
  } catch {
    // API unreachable at build time -- ship the static routes rather than failing the build.
    return staticRoutes;
  }
}
