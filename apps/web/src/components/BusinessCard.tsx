'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Star, MapPin, Phone, BadgeCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BusinessSummary } from '@/lib/api';

export function BusinessCard({ business }: { business: BusinessSummary }) {
  const t = useTranslations('featured');
  const locale = useLocale() as 'fr' | 'en';
  const categoryName = locale === 'fr' ? business.category.nameFr : business.category.nameEn;
  const cityName = locale === 'fr' ? business.city.nameFr : business.city.nameEn;
  const cover = business.images?.[0]?.url;

  return (
    <Card className="group overflow-hidden">
      <Link href={`/business/${business.slug}`} className="block">
        <div className="relative h-44 w-full overflow-hidden bg-primary-light">
          {cover ? (
            <Image
              src={cover}
              alt={business.name}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-primary/40">{business.name[0]}</div>
          )}
          {business.isVerified && (
            <Badge variant="verified" className="absolute left-3 top-3 bg-white/95">
              <BadgeCheck className="h-3.5 w-3.5" /> {t('verified')}
            </Badge>
          )}
        </div>
      </Link>

      <div className="p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <Link href={`/business/${business.slug}`}>
            <h3 className="line-clamp-1 font-semibold text-gray-900 hover:text-primary">{business.name}</h3>
          </Link>
          {business.reviewCount > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-secondary-dark">
              <Star className="h-3.5 w-3.5 fill-secondary text-secondary" />
              {business.averageRating}
            </span>
          )}
        </div>

        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">{categoryName}</p>

        {business.shortDescription && (
          <p className="mb-3 line-clamp-2 text-sm text-gray-500">{business.shortDescription}</p>
        )}

        <p className="mb-4 flex items-center gap-1 text-sm text-gray-500">
          <MapPin className="h-3.5 w-3.5" /> {cityName}
        </p>

        <div className="flex gap-2">
          <Link href={`/business/${business.slug}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              {t('viewProfile')}
            </Button>
          </Link>
          <a href="#" className="shrink-0" aria-label={t('call')}>
            <Button variant="primary" size="sm">
              <Phone className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>
    </Card>
  );
}
