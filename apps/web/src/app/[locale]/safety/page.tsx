import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ShieldCheck, Navigation as NavigationIcon, LifeBuoy } from 'lucide-react';
import { PageHero } from '@/components/PageHero';

export const metadata: Metadata = { title: 'Securite' };

export default async function SafetyPage() {
  const t = await getTranslations('safety');

  const items = [
    { icon: ShieldCheck, title: t('item1Title'), body: t('item1Body') },
    { icon: NavigationIcon, title: t('item2Title'), body: t('item2Body') },
    { icon: LifeBuoy, title: t('item3Title'), body: t('item3Body') },
  ];

  return (
    <>
      <PageHero title={t('heroTitle')} subtitle={t('heroSubtitle')} />
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {items.map((item) => (
            <div key={item.title} className="flex gap-5 rounded-2xl border border-gray-100 p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo text-white">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="mb-1 font-semibold text-indigo">{item.title}</h2>
                <p className="text-sm text-gray-600">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
