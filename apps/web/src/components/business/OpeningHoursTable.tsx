import { useTranslations } from 'next-intl';
import type { OpeningHour } from '@/lib/api';

const ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export function OpeningHoursTable({ hours }: { hours: OpeningHour[] }) {
  const t = useTranslations('business');
  const byDay = new Map(hours.map((h) => [h.day, h]));
  const today = ORDER[(new Date().getDay() + 6) % 7]; // getDay(): 0=Sun -> map to ORDER index

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <h3 className="mb-3 font-semibold text-gray-900">{t('hours')}</h3>
      <ul className="space-y-1.5 text-sm">
        {ORDER.map((day) => {
          const h = byDay.get(day);
          const isToday = day === today;
          return (
            <li key={day} className={`flex justify-between ${isToday ? 'font-semibold text-primary' : 'text-gray-600'}`}>
              <span>{t(`days.${day}` as never)}</span>
              <span>{h?.opensAt && h?.closesAt ? `${h.opensAt} - ${h.closesAt}` : t('closedToday')}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
