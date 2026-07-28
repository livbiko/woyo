import { Header } from '@/components/Header';

export function PageHero({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="bg-indigo text-white">
      <Header dark />
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-32 text-center sm:px-6 sm:pt-40 lg:px-8">
        <h1 className="text-4xl font-extrabold sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-4 text-lg text-white/70">{subtitle}</p>}
      </div>
    </div>
  );
}
