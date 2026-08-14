"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CollectionResponseDTO, pickCollectionImage } from "@/lib/types/api";

interface SecondaryCollectionsProps {
  collections: CollectionResponseDTO[];
}

export function SecondaryCollections({ collections }: SecondaryCollectionsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const womenCollection = collections.find(c => c.targetAudience === 'WOMEN');
  const menCollection = collections.find(c => c.targetAudience === 'MEN');

  const validCount = [womenCollection, menCollection].filter(Boolean).length;

  useEffect(() => {
    if (validCount <= 1) return;

    const interval = setInterval(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const isMobile = container.scrollWidth > container.clientWidth;
      if (!isMobile) return;

      setActiveIndex((current) => {
        const nextIndex = current === 0 ? 1 : 0;
        container.scrollTo({ left: nextIndex * container.clientWidth, behavior: 'smooth' });
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [validCount]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const index = Math.round(container.scrollLeft / container.clientWidth);
    setActiveIndex((current) => (index === current ? current : index));
  };

  if (!womenCollection && !menCollection) {
    return null;
  }

  const validCollections = [womenCollection, menCollection].filter(Boolean) as CollectionResponseDTO[];

  return (
    <section className="w-full bg-background pt-4 pb-12 md:py-0">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-proximity md:grid md:grid-cols-2 md:overflow-visible [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {validCollections.map((collection) => {
          const imageSrc = pickCollectionImage(collection, [
            "portraitImageUrl",
            "heroImageUrl",
            "squareImageUrl",
          ]);
          return (
          <div
            key={collection.id}
            className="relative w-full h-[65vh] md:h-[80vh] flex-shrink-0 snap-start group overflow-hidden bg-zinc-900"
          >
            {imageSrc && (
              <Image
                src={imageSrc}
                alt={collection.name}
                fill
                className="object-cover object-center transition-transform duration-[1.5s] ease-out group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-700 group-hover:opacity-90" />

            <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 md:pb-24 px-6 text-center text-white z-10">
              <h3 className="font-serif text-3xl md:text-4xl tracking-widest uppercase mb-4">
                {collection.name === 'WOMAN' ? 'MULHER' : collection.name === 'MAN' ? 'HOMEM' : collection.name}
              </h3>
              {collection.description && (
                <p className="text-sm md:text-base font-light tracking-wider max-w-md mb-8 opacity-90 line-clamp-2 md:line-clamp-3">
                  {collection.description}
                </p>
              )}
              <Link
                href={`/collections/${collection.slug}`}
                className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all duration-500 ease-out"
              >
                Explorar Coleção
              </Link>
            </div>
          </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-2 mt-6 md:hidden">
        {validCollections.map((_, idx) => (
          <button
            key={idx}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
              activeIndex === idx ? "bg-foreground w-6" : "bg-muted-foreground/30"
            }`}
            onClick={() => {
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({
                  left: idx * scrollContainerRef.current.clientWidth,
                  behavior: "smooth"
                });
                setActiveIndex(idx);
              }
            }}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
