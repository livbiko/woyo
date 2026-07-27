'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { MapPinned, User } from 'lucide-react';

export function Header() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white font-bold">
            W
          </span>
          <span className="text-xl font-bold text-gray-900">{t('brand.name')}</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/search" className="text-sm font-medium text-gray-700 hover:text-primary">
            {t('nav.findProfessionals')}
          </Link>
          <Link href="/become-a-provider" className="text-sm font-medium text-gray-700 hover:text-primary">
            {t('nav.becomeProvider')}
          </Link>
          <Link href={pathname} locale={locale === 'fr' ? 'en' : 'fr'} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-primary">
            <MapPinned className="h-4 w-4" />
            {locale === 'fr' ? 'EN' : 'FR'}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {!loading && user ? (
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-1.5 text-sm font-medium text-gray-700 sm:flex">
                <User className="h-4 w-4" /> {user.name}
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                {t('nav.logout')}
              </Button>
            </div>
          ) : (
            !loading && (
              <>
                <Link href="/login" className="hidden text-sm font-medium text-gray-700 hover:text-primary sm:block">
                  {t('nav.login')}
                </Link>
                <Link href="/register">
                  <Button size="sm">{t('nav.register')}</Button>
                </Link>
              </>
            )
          )}
        </div>
      </div>
    </header>
  );
}
