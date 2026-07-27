import { useTranslations } from 'next-intl';
import type { Service } from '@/lib/api';

function formatXof(amount: number) {
  return new Intl.NumberFormat('fr-CI', { maximumFractionDigits: 0 }).format(amount) + ' XOF';
}

export function ServicesList({ services }: { services: Service[] }) {
  const t = useTranslations('business');
  if (services.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <h3 className="mb-3 font-semibold text-gray-900">{t('services')}</h3>
      <ul className="divide-y divide-gray-100">
        {services.map((s) => (
          <li key={s.id} className="flex items-start justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{s.name}</p>
              {s.description && <p className="text-sm text-gray-500">{s.description}</p>}
            </div>
            <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-primary">
              {s.priceFrom !== null ? formatXof(s.priceFrom) : t('priceOnRequest')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
