import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHero } from '@/components/PageHero';

export const metadata: Metadata = { title: 'Mentions legales' };

export default async function LegalPage() {
  const t = await getTranslations('legal');

  return (
    <>
      <PageHero title={t('title')} />
      <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="mb-6 text-gray-600">{t('body')}</p>
        <a
          href="https://tekeche.com/woyo-confidentialite.html"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-indigo underline"
        >
          {t('privacyLink')}
        </a>
      </section>
    </>
  );
}
