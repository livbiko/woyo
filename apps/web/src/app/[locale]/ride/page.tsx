import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MapPin, Users, DollarSign } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Passager' };

export default async function RidePage() {
  const t = await getTranslations('ride');

  return (
    <>
      <PageHero title={t('heroTitle')} subtitle={t('heroSubtitle')} />

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 p-8">
            <h2 className="mb-2 text-xl font-bold text-indigo">{t('abidjanTitle')}</h2>
            <p className="text-gray-600">{t('abidjanBody')}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-indigo-light/5 p-8">
            <h2 className="mb-2 text-xl font-bold text-indigo">{t('elsewhereTitle')}</h2>
            <p className="text-gray-600">{t('elsewhereBody')}</p>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-bold text-indigo">{t('howTitle')}</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { icon: MapPin, text: t('how1') },
              { icon: Users, text: t('how2') },
              { icon: DollarSign, text: t('how3') },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo text-white">
                  <step.icon className="h-5 w-5" />
                </div>
                <p className="text-sm text-gray-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="mb-2 text-2xl font-bold text-indigo">{t('faresTitle')}</h2>
        <p className="mb-8 text-gray-600">{t('faresBody')}</p>
        <Button variant="primary" size="lg" disabled>
          {t('cta')}
        </Button>
      </section>
    </>
  );
}
