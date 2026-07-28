import { useTranslations } from 'next-intl';
import { MapPin } from 'lucide-react';

export function CitiesSection() {
  const t = useTranslations('home');

  return (
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <MapPin className="mx-auto mb-4 h-8 w-8 text-red" />
        <h2 className="mb-4 text-3xl font-bold text-ink">{t('citiesTitle')}</h2>
        <p className="text-base leading-relaxed text-gray-600">{t('citiesBody')}</p>
      </div>
    </section>
  );
}
