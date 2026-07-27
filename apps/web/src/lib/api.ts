// Server Components/route handlers run inside the container and must reach
// the api service by its Docker network name; the browser runs on the host
// and needs localhost. NEXT_PUBLIC_* is baked in at build time, so the
// server-only API_URL (read at request time) is what makes the same image
// work correctly both in `docker-compose up` and in `npm run dev`.
const API_URL =
  typeof window === 'undefined'
    ? (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001/api')
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001/api');

export interface Category {
  id: string;
  slug: string;
  nameFr: string;
  nameEn: string;
  icon: string;
  featuredOrder: number | null;
}

export interface City {
  id: string;
  slug: string;
  nameFr: string;
  nameEn: string;
  region: string | null;
  latitude: number;
  longitude: number;
}

export interface BusinessSummary {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  shortDescription: string | null;
  category: Category;
  city: City;
  isVerified: boolean;
  status: string;
  latitude: number | null;
  longitude: number | null;
  images: { id: string; url: string; order: number }[];
  averageRating: number;
  reviewCount: number;
}

export interface OpeningHour {
  day: string;
  opensAt: string | null;
  closesAt: string | null;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  priceFrom: number | null;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { name: string };
}

export interface BusinessDetail extends BusinessSummary {
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  openingHours: OpeningHour[];
  services: Service[];
  reviews: Review[];
}

export interface SearchResult {
  items: BusinessSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    cache: options.cache ?? 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getCategories: () => apiFetch<Category[]>('/categories'),
  getCities: () => apiFetch<City[]>('/cities'),
  searchBusinesses: (params: Record<string, string | boolean | number | undefined>) => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') qs.set(key, String(value));
    }
    return apiFetch<SearchResult>(`/businesses?${qs.toString()}`);
  },
  getBusiness: (slug: string) => apiFetch<BusinessDetail>(`/businesses/${slug}`),
  createBusiness: (data: Record<string, unknown>, token: string) =>
    apiFetch('/businesses', { method: 'POST', body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } }),
  login: (email: string, password: string) =>
    apiFetch<{ accessToken: string; user: { id: string; name: string; email: string; role: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data: { email: string; password: string; name: string; phone?: string }) =>
    apiFetch<{ accessToken: string; user: { id: string; name: string; email: string; role: string } }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify(data) },
    ),
  me: (token: string) =>
    apiFetch<{ id: string; name: string; email: string; role: string }>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const googleAuthUrl = () => `${API_URL}/auth/google`;
