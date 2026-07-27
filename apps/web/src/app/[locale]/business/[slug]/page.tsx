import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { BadgeCheck, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { Gallery } from '@/components/business/Gallery';
import { OpeningHoursTable } from '@/components/business/OpeningHoursTable';
import { ServicesList } from '@/components/business/ServicesList';
import { ReviewsList } from '@/components/business/ReviewsList';
import { ContactCard } from '@/components/business/ContactCard';
import { Badge } from '@/components/ui/badge';

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

async function getBusinessOr404(slug: string) {
  try {
    return await api.getBusiness(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessOr404(slug);
  if (!business) return {};

  return {
    title: business.name,
    description: business.shortDescription ?? business.description ?? undefined,
    openGraph: {
      title: business.name,
      description: business.shortDescription ?? undefined,
      images: business.images.length ? [business.images[0].url] : undefined,
      type: 'website',
    },
  };
}

export default async function BusinessProfilePage({ params }: Props) {
  const { slug } = await params;
  const business = await getBusinessOr404(slug);
  if (!business) notFound();

  const t = await getTranslations('business');
  const tFeatured = await getTranslations('featured');
  const locale = (await getLocale()) as 'fr' | 'en';
  const categoryName = locale === 'fr' ? business.category.nameFr : business.category.nameEn;
  const cityName = locale === 'fr' ? business.city.nameFr : business.city.nameEn;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description: business.description ?? business.shortDescription ?? undefined,
    image: business.images.map((i) => i.url),
    telephone: business.phone ?? undefined,
    email: business.email ?? undefined,
    url: business.website ?? undefined,
    address: business.address
      ? { '@type': 'PostalAddress', streetAddress: business.address, addressLocality: cityName, addressCountry: 'CI' }
      : undefined,
    geo:
      business.latitude && business.longitude
        ? { '@type': 'GeoCoordinates', latitude: business.latitude, longitude: business.longitude }
        : undefined,
    aggregateRating:
      business.reviewCount > 0
        ? { '@type': 'AggregateRating', ratingValue: business.averageRating, reviewCount: business.reviewCount }
        : undefined,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="mb-4 text-sm text-gray-400">
        <span>{categoryName}</span> <span className="mx-1">/</span> <span>{cityName}</span>
      </nav>

      <Gallery images={business.images} name={business.name} />

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{business.name}</h1>
            {business.isVerified && (
              <Badge variant="verified">
                <BadgeCheck className="h-3.5 w-3.5" /> {tFeatured('verified')}
              </Badge>
            )}
            {business.reviewCount > 0 && (
              <span className="flex items-center gap-1 text-sm font-semibold text-secondary-dark">
                <Star className="h-4 w-4 fill-secondary text-secondary" /> {business.averageRating} ({business.reviewCount})
              </span>
            )}
          </div>

          {business.description && (
            <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5">
              <h3 className="mb-2 font-semibold text-gray-900">{t('about')}</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{business.description}</p>
            </div>
          )}

          <div className="mb-6">
            <ServicesList services={business.services} />
          </div>

          <ReviewsList reviews={business.reviews} averageRating={business.averageRating} />
        </div>

        <div className="space-y-6">
          <ContactCard business={business} />
          <OpeningHoursTable hours={business.openingHours} />
        </div>
      </div>
    </div>
  );
}
