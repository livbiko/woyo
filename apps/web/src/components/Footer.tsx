import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Facebook, Instagram, Linkedin } from 'lucide-react';

export function Footer() {
  const t = useTranslations('footer');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold">
                W
              </span>
              <span className="text-lg font-bold text-gray-900">Woyo</span>
            </div>
            <p className="text-sm text-gray-500">{t('description')}</p>
            <div className="mt-4 flex gap-3">
              <a href="#" aria-label="Facebook" className="text-gray-400 hover:text-primary">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" aria-label="Instagram" className="text-gray-400 hover:text-primary">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" aria-label="LinkedIn" className="text-gray-400 hover:text-primary">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('company')}</h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/about" className="hover:text-primary">{t('about')}</Link></li>
              <li><Link href="/contact" className="hover:text-primary">{t('contact')}</Link></li>
              <li><Link href="/blog" className="hover:text-primary">{t('blog')}</Link></li>
              <li><Link href="/careers" className="hover:text-primary">{t('careers')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Legal</h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/privacy" className="hover:text-primary">{t('privacy')}</Link></li>
              <li><Link href="/terms" className="hover:text-primary">{t('terms')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
          &copy; {year} Woyo. {t('rights')}
        </div>
      </div>
    </footer>
  );
}
