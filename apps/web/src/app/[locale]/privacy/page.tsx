import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHero } from '@/components/PageHero';

export const metadata: Metadata = { title: 'Politique de confidentialite' };

export default async function PrivacyPage() {
  const t = await getTranslations('privacy');

  const sections = [1, 2, 3, 4, 5, 6, 7] as const;

  return (
    <>
      <PageHero title={t('title')} subtitle={t('lastUpdated')} />
      <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-10 text-gray-600">
          <p>{t('intro')}</p>
          {sections.map((n) => (
            <div key={n}>
              <h2 className="mb-2 text-lg font-semibold text-ink">{t(`section${n}Title`)}</h2>
              <p>{t(`section${n}Body`)}</p>
            </div>
          ))}
          <div>
            <h2 className="mb-2 text-lg font-semibold text-ink">{t('contactTitle')}</h2>
            <p>{t('contactBody')}</p>
          </div>
        </div>
      </section>
    </>
  );
}
