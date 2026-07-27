import type { Metadata } from 'next';
import { SearchPageClient } from '@/components/search/SearchPageClient';

export const metadata: Metadata = {
  title: 'Recherche',
  description: 'Trouvez des professionnels et entreprises de confiance en Cote d\'Ivoire.',
};

export default function SearchPage() {
  return <SearchPageClient />;
}
