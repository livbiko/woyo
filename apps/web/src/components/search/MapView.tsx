'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { BusinessSummary } from '@/lib/api';
import 'leaflet/dist/leaflet.css';

// Default Leaflet marker icons reference bundled asset paths that break under
// Next.js's bundler -- point them at unpkg's hosted copies instead (the
// standard workaround for react-leaflet + Next.js/Webpack).
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const ABIDJAN_CENTER: [number, number] = [5.36, -4.0083];

export function MapView({ businesses }: { businesses: BusinessSummary[] }) {
  const locale = useLocale() as 'fr' | 'en';
  const withCoords = businesses.filter((b) => b.latitude !== null && b.longitude !== null);
  const center: [number, number] = withCoords.length
    ? [withCoords[0].latitude as number, withCoords[0].longitude as number]
    : ABIDJAN_CENTER;

  return (
    <div className="h-[70vh] w-full overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
      <MapContainer center={center} zoom={12} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {withCoords.map((b) => (
          <Marker key={b.id} position={[b.latitude as number, b.longitude as number]} icon={markerIcon}>
            <Popup>
              <div className="min-w-[160px]">
                <p className="mb-1 font-semibold">{b.name}</p>
                <p className="mb-2 text-xs text-gray-500">
                  {locale === 'fr' ? b.category.nameFr : b.category.nameEn}
                </p>
                <Link href={`/business/${b.slug}`} className="text-sm text-primary hover:underline">
                  {locale === 'fr' ? 'Voir le profil' : 'View profile'}
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
