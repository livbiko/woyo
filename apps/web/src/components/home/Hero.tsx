'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Search, MapPin, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export function Hero() {
  const t = useTranslations('hero');
  const router = useRouter();
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (city) params.set('cityLabel', city);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-light to-surface">
      <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl"
        >
          {t('title')}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-4 max-w-2xl text-base text-gray-600 sm:text-lg"
        >
          {t('subtitle')}
        </motion.p>

        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          onSubmit={handleSearch}
          className="mx-auto mt-10 flex max-w-2xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('professionPlaceholder')}
              className="h-12 border-none pl-9 focus:ring-0"
              // The parent motion.form animates opacity 0->1 on mount; some
              // browsers transiently set caret-color on nested inputs while
              // an ancestor is invisible, which never matches the SSR
              // markup. Cosmetic only -- suppress the resulting (harmless)
              // hydration warning rather than the warning being noise.
              suppressHydrationWarning
            />
          </div>
          <div className="relative flex-1 sm:border-l sm:border-gray-100">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t('locationPlaceholder')}
              className="h-12 border-none pl-9 focus:ring-0"
              suppressHydrationWarning
            />
          </div>
          <Button type="submit" size="lg" className="shrink-0">
            {t('searchButton')}
          </Button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-3"
        >
          <Button variant="outline" size="md" onClick={() => router.push('/search')}>
            {t('findProfessionals')} <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="md" onClick={() => router.push('/become-a-provider')}>
            {t('becomeProvider')}
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
