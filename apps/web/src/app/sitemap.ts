import type { MetadataRoute } from 'next';

const SITE_URL = 'https://225woyo.com';
const PAGES = ['', '/ride', '/drive', '/safety', '/about', '/legal'];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: 'monthly',
    priority: path === '' ? 1 : 0.7,
  }));
}
