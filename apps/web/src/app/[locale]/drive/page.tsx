import type { Metadata } from 'next';
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
      <PageHero title={t('heroTitle')} subtitle={t('heroSubtitle')} />

      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-10 text-center text-2xl font-bold text-indigo">{t('howTitle')}</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.title} className="rounded-2xl bg-white p-6 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo text-white">
                  <step.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1 font-semibold text-indigo">{step.title}</h3>
                <p className="text-sm text-gray-500">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-indigo p-10 text-white">
          <h2 className="mb-2 text-2xl font-bold">{t('earnTitle')}</h2>
          <p className="text-white/70">{t('earnBody')}</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-center text-2xl font-bold text-indigo">{t('requirementsTitle')}</h2>
        <ul className="mx-auto max-w-md space-y-3">
          {requirements.map((req) => (
            <li key={req} className="flex items-center gap-3 text-gray-700">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-gold-dark" />
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
