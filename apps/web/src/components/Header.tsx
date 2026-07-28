'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { Globe } from 'lucide-react';

export function Header({ dark = false }: { dark?: boolean }) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const textColor = dark ? 'text-white' : 'text-indigo';

  return (
    <header className={cn_header(dark)}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className={`flex items-center gap-2 font-bold text-lg ${textColor}`}>
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gold text-indigo-dark font-black">
            W
          </span>
          Woyo
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/ride" className={`text-sm font-medium hover:opacity-70 ${textColor}`}>
            {t('ride')}
          </Link>
          <Link href="/drive" className={`text-sm font-medium hover:opacity-70 ${textColor}`}>
            {t('drive')}
          </Link>
          <Link href="/about" className={`text-sm font-medium hover:opacity-70 ${textColor}`}>
            {t('about')}
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href={pathname}
            locale={locale === 'fr' ? 'en' : 'fr'}
            className={`flex items-center gap-1 text-sm font-medium hover:opacity-70 ${textColor}`}
          >
            <Globe className="h-4 w-4" />
            {locale === 'fr' ? 'EN' : 'FR'}
          </Link>
        </div>
      </div>
    </header>
  );
}

function cn_header(dark: boolean) {
  return dark ? 'absolute inset-x-0 top-0 z-40' : 'sticky top-0 z-40 border-b border-gray-100 bg-white';
}
