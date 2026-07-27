'use client';

import { useTranslations, useLocale } from 'next-intl';
import type { Category, City } from '@/lib/api';

export interface Filters {
  q: string;
  category: string;
  city: string;
  verifiedOnly: boolean;
}

export function SearchFilters({
  categories,
  cities,
  filters,
  onChange,
}: {
  categories: Category[];
  cities: City[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const t = useTranslations('search.filters');
  const locale = useLocale() as 'fr' | 'en';

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
      <select
        value={filters.category}
        onChange={(e) => onChange({ ...filters, category: e.target.value })}
        className="h-11 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">{t('allCategories')}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.slug}>
            {locale === 'fr' ? c.nameFr : c.nameEn}
          </option>
        ))}
      </select>

      <select
        value={filters.city}
        onChange={(e) => onChange({ ...filters, city: e.target.value })}
        className="h-11 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">{t('allCities')}</option>
        {cities.map((c) => (
          <option key={c.id} value={c.slug}>
            {locale === 'fr' ? c.nameFr : c.nameEn}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={filters.verifiedOnly}
          onChange={(e) => onChange({ ...filters, verifiedOnly: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        {t('verifiedOnly')}
      </label>
    </div>
  );
}
