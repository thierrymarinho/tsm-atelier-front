"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { CollectionResponseDTO } from "@/lib/types/api";

export function SecondaryCollections() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: collections } = useQuery({
    queryKey: ['collections', 'home-secondary'],
    queryFn: async () => {
      const response = await apiClient.get<CollectionResponseDTO[]>('/v1/catalog/collections', {
        params: { position: 'HOME_SECONDARY' }
      });
      return response.data;
    }
  });

  const womenCollection = collections?.find(c => c.targetAudience === 'WOMEN');
  const menCollection = collections?.find(c => c.targetAudience === 'MEN');

  // Auto-scroll for mobile (5s interval)
  useEffect(() => {
    // We only want the auto-scroll to happen if there is more than 1 collection
    const validCount = [womenCollection, menCollection].filter(Boolean).length;
    if (validCount <= 1) return;

    const interval = setInterval(() => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const isMobile = container.scrollWidth > container.clientWidth;
        
        if (isMobile) {
          // If we are at index 0, go to 1. If at 1, go to 0.
          const nextIndex = activeIndex === 0 ? 1 : 0;
          const targetScroll = nextIndex * container.clientWidth;
          container.scrollTo({ left: targetScroll, behavior: 'smooth' });
          setActiveIndex(nextIndex);
        }
      }
    }, 5000); // 5 seconds interval

    return () => clearInterval(interval);
  }, [activeIndex, womenCollection, menCollection]);

  // Handle manual scroll to update activeIndex (e.g. when user swipes manually)
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const index = Math.round(container.scrollLeft / container.clientWidth);
      if (index !== activeIndex) {
        setActiveIndex(index);
      }
    }
  };

  if (!womenCollection && !menCollection) {
    return null;
  }

  const validCollections = [womenCollection, menCollection].filter(Boolean) as CollectionResponseDTO[];

  return (
    <section className="w-full bg-background pt-4 pb-12 md:py-0">
      {/* Desktop Grid / Mobile Carousel */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-2 md:overflow-visible [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {validCollections.map((collection) => (
          <div 
            key={collection.id}
            className="relative w-full h-[65vh] md:h-[80vh] flex-shrink-0 snap-start group overflow-hidden"
          >
            {/* Background Image */}
            <Image
              src={collection.portraitImageUrl || collection.heroImageUrl || collection.squareImageUrl}
              alt={collection.name}
              fill
              className="object-cover object-center transition-transform duration-[1.5s] ease-out group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {/* Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-700 group-hover:opacity-90" />

            {/* Content */}
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
        ))}
      </div>

      {/* Mobile Pagination Dots */}
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
