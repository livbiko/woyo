import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHero } from '@/components/PageHero';

export const metadata: Metadata = { title: 'A propos' };

export default async function AboutPage() {
  const t = await getTranslations('about');

  return (
    <>
      <PageHero title={t('heroTitle')} />
      <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-6 text-gray-600">
          <p>{t('body1')}</p>
          <p>{t('body2')}</p>
          <p>{t('body3')}</p>
        </div>
      </section>
    </>
  );
}
