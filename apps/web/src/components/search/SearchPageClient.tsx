'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { List, MapIcon, Search as SearchIcon } from 'lucide-react';
import { api, type Category, type City, type BusinessSummary } from '@/lib/api';
import { BusinessCard } from '@/components/BusinessCard';
import { SearchFilters, type Filters } from './SearchFilters';
import { Button } from '@/components/ui/button';

const MapView = dynamic(() => import('./MapView').then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="flex h-[70vh] items-center justify-center text-gray-400">Loading map...</div>,
});

export function SearchPageClient() {
  const t = useTranslations('search');
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [filters, setFilters] = useState<Filters>({
    q: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? '',
    city: searchParams.get('city') ?? '',
    verifiedOnly: false,
  });

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setCategories([]));
    api.getCities().then(setCities).catch(() => setCities([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .searchBusinesses({
        q: filters.q || undefined,
        category: filters.category || undefined,
        city: filters.city || undefined,
        verifiedOnly: filters.verifiedOnly || undefined,
        pageSize: 24,
      })
      .then((result) => {
        setBusinesses(result.items);
        setTotal(result.total);
      })
      .catch(() => {
        setBusinesses([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [filters]);

  const resultsLabel = useMemo(() => t('resultsCount', { count: total }), [t, total]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('title')}</h1>

      <div className="mb-6">
        <SearchFilters categories={categories} cities={cities} filters={filters} onChange={setFilters} />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">{loading ? '...' : resultsLabel}</p>
        <div className="flex overflow-hidden rounded-xl border border-gray-200">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium ${view === 'list' ? 'bg-primary text-white' : 'bg-white text-gray-600'}`}
          >
            <List className="h-4 w-4" /> {t('listView')}
          </button>
          <button
            onClick={() => setView('map')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium ${view === 'map' ? 'bg-primary text-white' : 'bg-white text-gray-600'}`}
          >
            <MapIcon className="h-4 w-4" /> {t('mapView')}
          </button>
        </div>
      </div>

      {!loading && businesses.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 py-20 text-center">
          <SearchIcon className="h-8 w-8 text-gray-300" />
          <p className="text-gray-500">{t('noResults')}</p>
          <Button variant="outline" onClick={() => setFilters({ q: '', category: '', city: '', verifiedOnly: false })}>
            Reset
          </Button>
        </div>
      )}

      {view === 'list' ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      ) : (
        <MapView businesses={businesses} />
      )}
    </div>
  );
}
