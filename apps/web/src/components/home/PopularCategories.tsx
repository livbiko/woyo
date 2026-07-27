import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { CategoryIcon } from '@/components/CategoryIcon';

export async function PopularCategories() {
  const t = await getTranslations('categories');
  const locale = (await getLocale()) as 'fr' | 'en';
  const categories = await api.getCategories();
  const popular = categories
    .filter((c) => c.featuredOrder !== null)
    .sort((a, b) => (a.featuredOrder ?? 0) - (b.featuredOrder ?? 0));

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t('title')}</h2>
        <p className="mt-2 text-gray-500">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {popular.map((category) => (
          <Link
            key={category.id}
            href={`/search?category=${category.slug}`}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-primary/20 hover:shadow-md"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <CategoryIcon name={category.icon} className="h-6 w-6" />
            </span>
            <span className="text-sm font-medium text-gray-800">
              {locale === 'fr' ? category.nameFr : category.nameEn}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
