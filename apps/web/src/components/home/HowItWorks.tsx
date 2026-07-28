import { useTranslations } from 'next-intl';
import { Smartphone, Car, Navigation } from 'lucide-react';

export function HowItWorks() {
  const t = useTranslations('home');
  const steps = [
    { icon: Smartphone, title: t('step1Title'), body: t('step1Body') },
    { icon: Car, title: t('step2Title'), body: t('step2Body') },
    { icon: Navigation, title: t('step3Title'), body: t('step3Body') },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <h2 className="mb-10 text-center text-3xl font-bold text-ink">{t('howItWorksTitle')}</h2>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        {steps.map((step, i) => (
          <div key={step.title} className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red text-white">
              <step.icon className="h-6 w-6" />
            </div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red">{i + 1}</p>
            <h3 className="mb-2 text-lg font-semibold text-ink">{step.title}</h3>
            <p className="text-sm text-gray-500">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
