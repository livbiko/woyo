import { Hero } from '@/components/home/Hero';
import { PopularCategories } from '@/components/home/PopularCategories';
import { FeaturedBusinesses } from '@/components/home/FeaturedBusinesses';
import { StatsSection } from '@/components/home/StatsSection';
import { Testimonials } from '@/components/home/Testimonials';

export default function HomePage() {
  return (
    <>
      <Hero />
      <PopularCategories />
      <FeaturedBusinesses />
      <StatsSection />
      <Testimonials />
    </>
  );
}
