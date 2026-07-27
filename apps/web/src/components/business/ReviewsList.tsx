import { useTranslations, useLocale } from 'next-intl';
import { Star } from 'lucide-react';
import type { Review } from '@/lib/api';

export function ReviewsList({ reviews, averageRating }: { reviews: Review[]; averageRating: number }) {
  const t = useTranslations('business');
  const locale = useLocale();

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{t('reviews')}</h3>
        {reviews.length > 0 && (
          <span className="flex items-center gap-1 text-sm font-semibold text-secondary-dark">
            <Star className="h-4 w-4 fill-secondary text-secondary" /> {averageRating} ({reviews.length})
          </span>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-gray-500">{t('noReviews')}</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{r.user.name}</p>
                <span className="text-xs text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')}
                </span>
              </div>
              <div className="mb-1 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-secondary text-secondary' : 'text-gray-200'}`} />
                ))}
              </div>
              {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
