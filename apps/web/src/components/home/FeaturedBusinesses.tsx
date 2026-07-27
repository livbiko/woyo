import { getTranslations } from 'next-intl/server';
import { api } from '@/lib/api';
import { BusinessCard } from '@/components/BusinessCard';

export async function FeaturedBusinesses() {
  const t = await getTranslations('featured');
  const { items } = await api.searchBusinesses({ verifiedOnly: true, pageSize: 6 });

  if (items.length === 0) return null;

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t('title')}</h2>
          <p className="mt-2 text-gray-500">{t('subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
        </div>
      </div>
    </section>
  );
}
