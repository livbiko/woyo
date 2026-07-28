'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';

export function Hero() {
  const t = useTranslations('home');

  return (
    <section className="relative overflow-hidden bg-indigo text-white">
      <Header dark />
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-32 sm:px-6 sm:pt-40 lg:px-8">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-6xl"
        >
          {t('heroTitle')}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-4 max-w-lg text-lg text-white/70"
        >
          {t('heroSubtitle')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Link
            href="/ride"
            className="group flex flex-col justify-between rounded-2xl bg-white p-6 text-indigo transition-transform hover:-translate-y-1"
          >
            <div>
              <p className="text-xl font-bold">{t('riderCta')}</p>
            </div>
            <Button variant="primary" className="mt-6 w-full justify-center">
              {t('riderCta')}
            </Button>
          </Link>
          <Link
            href="/drive"
            className="group flex flex-col justify-between rounded-2xl border border-white/20 bg-white/5 p-6 backdrop-blur transition-transform hover:-translate-y-1"
          >
            <div>
              <p className="text-xl font-bold">{t('driverCta')}</p>
            </div>
            <Button variant="white" className="mt-6 w-full justify-center">
              {t('driverCta')}
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
