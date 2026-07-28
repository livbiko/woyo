import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { UserPlus, ShieldCheck, Navigation as NavigationIcon, CheckCircle2 } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Chauffeur' };

export default async function DrivePage() {
  const t = await getTranslations('drive');

  const steps = [
    { icon: UserPlus, title: t('how1Title'), body: t('how1Body') },
    { icon: ShieldCheck, title: t('how2Title'), body: t('how2Body') },
    { icon: NavigationIcon, title: t('how3Title'), body: t('how3Body') },
  ];

  const requirements = [t('req1'), t('req2'), t('req3'), t('req4')];

  return (
    <>
      <PageHero
        title={t('heroTitle')}
        subtitle={t('heroSubtitle')}
        image="https://images.unsplash.com/photo-1473655587843-eda8944061e8?w=1920&q=80"
      />

      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-10 text-center text-2xl font-bold text-ink">{t('howTitle')}</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.title} className="rounded-2xl bg-white p-6 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red text-white">
                  <step.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1 font-semibold text-ink">{step.title}</h3>
                <p className="text-sm text-gray-500">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-red text-white sm:grid-cols-2">
          <div className="relative h-64 sm:h-auto">
            <Image
              src="https://images.unsplash.com/photo-1762095996527-126e49ef9d72?w=1200&q=80"
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          </div>
          <div className="flex flex-col justify-center p-10">
            <h2 className="mb-2 text-2xl font-bold">{t('earnTitle')}</h2>
            <p className="text-white/85">{t('earnBody')}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-center text-2xl font-bold text-ink">{t('requirementsTitle')}</h2>
        <ul className="mx-auto max-w-md space-y-3">
          {requirements.map((req) => (
            <li key={req} className="flex items-center gap-3 text-gray-700">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-red" />
              {req}
            </li>
          ))}
        </ul>
        <div className="mt-10 text-center">
          <Button variant="primary" size="lg" disabled>
            {t('cta')}
          </Button>
        </div>
      </section>
    </>
  );
}
