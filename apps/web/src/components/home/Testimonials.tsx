import { getTranslations } from 'next-intl/server';
import { Star } from 'lucide-react';

// Placeholder illustrative testimonials for pre-launch design review --
// replace with real customer quotes once Woyo has live traffic.
const TESTIMONIALS = [
  { name: 'Aya K.', role: 'Cocody, Abidjan', quote: 'J\'ai trouve un electricien fiable en moins de 10 minutes. Tres pratique !' },
  { name: 'Yao B.', role: 'Marcory, Abidjan', quote: 'Woyo m\'a permis de comparer plusieurs avocats avant de faire mon choix.' },
  { name: 'Fatou D.', role: 'Yamoussoukro', quote: 'Enfin un annuaire moderne pour trouver des professionnels de confiance.' },
];

export async function Testimonials() {
  const t = await getTranslations('testimonials');

  return (
    <section className="bg-surface py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-center text-2xl font-bold text-gray-900 sm:text-3xl">{t('title')}</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <div key={item.name} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-3 flex gap-0.5 text-secondary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-secondary" />
                ))}
              </div>
              <p className="mb-4 text-sm text-gray-600">&ldquo;{item.quote}&rdquo;</p>
              <p className="text-sm font-semibold text-gray-900">{item.name}</p>
              <p className="text-xs text-gray-400">{item.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
