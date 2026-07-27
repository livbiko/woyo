// Types shared between the API and any future consumer (web, mobile).
// Kept intentionally small for Phase 1 -- grows as the domain grows.

export const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export interface OpeningHourDTO {
  day: DayOfWeek;
  opensAt: string | null; // "08:00" | null (closed that day)
  closesAt: string | null;
}

export interface BusinessSummaryDTO {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  shortDescription: string | null;
  category: { id: string; slug: string; nameFr: string; nameEn: string };
  city: { id: string; slug: string; nameFr: string; nameEn: string };
  isVerified: boolean;
  averageRating: number;
  reviewCount: number;
  latitude: number | null;
  longitude: number | null;
}

export interface BusinessDetailDTO extends BusinessSummaryDTO {
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  gallery: string[];
  openingHours: OpeningHourDTO[];
  services: { id: string; name: string; description: string | null; priceFrom: number | null }[];
}

export interface SearchFiltersDTO {
  q?: string;
  category?: string;
  city?: string;
  verifiedOnly?: boolean;
  page?: number;
  pageSize?: number;
}
