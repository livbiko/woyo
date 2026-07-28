import { Hero } from '@/components/home/Hero';
import { HowItWorks } from '@/components/home/HowItWorks';
import { CitiesSection } from '@/components/home/CitiesSection';
import { SafetyTeaser } from '@/components/home/SafetyTeaser';
import { DownloadSection } from '@/components/home/DownloadSection';

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <CitiesSection />
      <SafetyTeaser />
      <DownloadSection />
    </>
  );
}
