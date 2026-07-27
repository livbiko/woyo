'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Phone, MessageCircle, Mail, Globe, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BusinessDetail } from '@/lib/api';

const LocationMap = dynamic(() => import('./LocationMap').then((m) => m.LocationMap), { ssr: false });

export function ContactCard({ business }: { business: BusinessDetail }) {
  const t = useTranslations('business');

  return (
    <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5">
      {business.address && (
        <p className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {business.address}
        </p>
      )}

      <div className="grid grid-cols-1 gap-2">
        {business.phone && (
          <a href={`tel:${business.phone}`}>
            <Button variant="primary" className="w-full justify-start">
              <Phone className="h-4 w-4" /> {t('call')}
            </Button>
          </a>
        )}
        {business.whatsapp && (
          <a
            href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${business.name}, je vous contacte via Woyo.`)}`}
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="secondary" className="w-full justify-start">
              <MessageCircle className="h-4 w-4" /> {t('whatsapp')}
            </Button>
          </a>
        )}
        {business.email && (
          <a href={`mailto:${business.email}`}>
            <Button variant="outline" className="w-full justify-start">
              <Mail className="h-4 w-4" /> {business.email}
            </Button>
          </a>
        )}
        {business.website && (
          <a href={business.website} target="_blank" rel="noreferrer">
            <Button variant="outline" className="w-full justify-start">
              <Globe className="h-4 w-4" /> {t('website')}
            </Button>
          </a>
        )}
      </div>

      {business.latitude && business.longitude && (
        <LocationMap latitude={business.latitude} longitude={business.longitude} />
      )}
    </div>
  );
}
