import { getTranslations } from 'next-intl/server';

export async function StatsSection() {
  const t = await getTranslations('stats');
  const stats = [
    { value: '100,000+', label: t('businesses') },
    { value: '50+', label: t('cities') },
    { value: '1M+', label: t('monthlyVisitors') },
  ];

  return (
    <section className="bg-primary py-14">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 text-center sm:grid-cols-3 sm:px-6 lg:px-8">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-3xl font-bold text-white sm:text-4xl">{stat.value}</p>
            <p className="mt-1 text-sm font-medium text-primary-light">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
