import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Facebook, Instagram, Linkedin } from 'lucide-react';

export function Footer() {
  const t = useTranslations('footer');
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-3 flex items-center gap-2 font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-red text-white font-black">
                W
              </span>
              Woyo
            </div>
            <p className="text-sm text-white/60">{t('tagline')}</p>
            <div className="mt-4 flex gap-3">
              <a href="#" aria-label="Facebook" className="text-white/50 hover:text-red">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" aria-label="Instagram" className="text-white/50 hover:text-red">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" aria-label="LinkedIn" className="text-white/50 hover:text-red">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white/90">{t('company')}</h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li><Link href="/about" className="hover:text-red">{t('about')}</Link></li>
              <li><Link href="/safety" className="hover:text-red">{t('safety')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white/90">{t('product')}</h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li><Link href="/ride" className="hover:text-red">{t('ride')}</Link></li>
              <li><Link href="/drive" className="hover:text-red">{t('drive')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white/90">{t('legal')}</h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li><Link href="/privacy" className="hover:text-red">{t('privacy')}</Link></li>
              <li><Link href="/legal" className="hover:text-red">{t('terms')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/40">
          &copy; {year} Woyo — Livbiko. {t('rights')}
        </div>
      </div>
    </footer>
  );
}
