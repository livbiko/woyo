import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SafetyTeaser() {
  const t = useTranslations('home');

  return (
    <section className="bg-indigo py-20 text-white">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
        <ShieldCheck className="mb-4 h-10 w-10 text-gold" />
        <h2 className="mb-4 text-3xl font-bold">{t('safetyTitle')}</h2>
        <p className="mb-8 max-w-xl text-white/70">{t('safetyBody')}</p>
        <Link href="/safety">
          <Button variant="white">{t('safetyTitle')}</Button>
        </Link>
      </div>
    </section>
  );
}
