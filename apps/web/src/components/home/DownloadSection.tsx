import { useTranslations } from 'next-intl';
import { Apple, PlayCircle } from 'lucide-react';

// Store links deliberately omitted -- the app isn't published on either
// store yet (checked against the actual EAS/Play Console state before
// writing this section). "Coming soon" badges instead of dead/fake links.
export function DownloadSection() {
  const t = useTranslations('home');

  return (
    <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
      <h2 className="mb-3 text-3xl font-bold text-indigo">{t('downloadTitle')}</h2>
      <p className="mb-8 text-gray-500">{t('downloadBody')}</p>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <span className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-400">
          <Apple className="h-5 w-5" /> App Store — {t('comingSoon')}
        </span>
        <span className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-400">
          <PlayCircle className="h-5 w-5" /> Google Play — {t('comingSoon')}
        </span>
      </div>
    </section>
  );
}
