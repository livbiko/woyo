'use client';

import { useState } from 'react';
import Image from 'next/image';

export function Gallery({ images, name }: { images: { id: string; url: string }[]; name: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return <div className="flex h-72 items-center justify-center rounded-2xl bg-primary-light text-primary/40 sm:h-96">{name}</div>;
  }

  return (
    <div>
      <div className="relative h-72 w-full overflow-hidden rounded-2xl sm:h-96">
        <Image src={images[active].url} alt={name} fill sizes="100vw" className="object-cover" priority />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === active ? 'border-primary' : 'border-transparent'}`}
            >
              <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
