'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';

export function Hero() {
  const t = useTranslations('home');

  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <Image
        src="https://images.unsplash.com/photo-1636935529049-2078e9ee3e6c?w=1920&q=80"
        alt=""
        fill
        priority
        className="object-cover opacity-60"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-red/40" />
      <div className="relative">
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
            className="mt-4 max-w-lg text-lg text-white/80"
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
              className="group flex flex-col justify-between rounded-2xl bg-white p-6 text-ink transition-transform hover:-translate-y-1"
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
              className="group flex flex-col justify-between rounded-2xl border border-white/30 bg-black/30 p-6 backdrop-blur transition-transform hover:-translate-y-1"
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
      </div>
    </section>
  );
}
