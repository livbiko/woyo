import Image from 'next/image';
import { Header } from '@/components/Header';

export function PageHero({
  title,
  subtitle,
  image,
}: {
  title: string;
  subtitle?: string;
  image?: string;
}) {
  return (
    <div className="relative overflow-hidden bg-red text-white">
      {image && (
        <>
          <Image src={image} alt="" fill priority className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-red/80" />
        </>
      )}
      <div className="relative">
        <Header dark />
        <div className="mx-auto max-w-4xl px-4 pb-16 pt-32 text-center sm:px-6 sm:pt-40 lg:px-8">
          <h1 className="text-4xl font-extrabold sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-4 text-lg text-white/80">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
