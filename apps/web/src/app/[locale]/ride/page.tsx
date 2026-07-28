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
      <PageHero
        title={t('heroTitle')}
        subtitle={t('heroSubtitle')}
        image="https://images.unsplash.com/photo-1744413265148-0932ccf64384?w=1920&q=80"
      />

      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="mb-2 text-2xl font-bold text-ink">{t('descriptionTitle')}</h2>
        <p className="text-gray-600">{t('descriptionBody')}</p>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-bold text-ink">{t('howTitle')}</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { icon: MapPin, text: t('how1') },
              { icon: Users, text: t('how2') },
              { icon: DollarSign, text: t('how3') },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red text-white">
                  <step.icon className="h-5 w-5" />
                </div>
                <p className="text-sm text-gray-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="mb-2 text-2xl font-bold text-ink">{t('faresTitle')}</h2>
        <p className="mb-8 text-gray-600">{t('faresBody')}</p>
        <Button variant="primary" size="lg" disabled>
          {t('cta')}
        </Button>
      </section>
    </>
  );
}
