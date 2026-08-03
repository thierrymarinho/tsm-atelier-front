"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { CollectionResponseDTO } from "@/lib/types/api";

export function HomeHero() {
  const { data: collection, isLoading } = useQuery({
    queryKey: ['collections', 'home-main'],
    queryFn: async () => {
      const response = await apiClient.get<CollectionResponseDTO[]>('/v1/catalog/collections', {
        params: { position: 'HOME_MAIN' }
      });
      return Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : null;
    }
  });

  if (isLoading) {
    return (
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-muted animate-pulse">
        {/* Placeholder while loading */}
      </section>
    );
  }

  if (!collection) {
    // Fallback if no collection is configured for HOME_MAIN
    return (
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-zinc-900">
        <div className="relative z-10 flex flex-col items-center text-center text-white mt-20 px-4">
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl tracking-widest uppercase mb-6">
            TSM Atelier
          </h1>
          <p className="text-sm md:text-base font-light tracking-[0.2em] uppercase max-w-lg mb-10">
            Welcome to the new era of luxury.
          </p>
        </div>
      </section>
    );
  }

  // Split name for visual effect if it has multiple words
  const nameParts = collection.name.split(' ');
  const titleHtml = nameParts.length > 1 
    ? <>{nameParts[0]} <br /> {nameParts.slice(1).join(' ')}</>
    : collection.name;

  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background Images for Responsive Design */}
      <div className="absolute inset-0 w-full h-full">
        {/* Desktop Image */}
        <div className="hidden md:block absolute inset-0 w-full h-full">
          <Image
            src={collection.heroImageUrl || collection.portraitImageUrl || collection.squareImageUrl}
            alt={collection.name}
            fill
            className="object-cover object-center brightness-75 scale-105 animate-pulse [animation-duration:10s]"
            priority
          />
        </div>
        
        {/* Mobile Image */}
        <div className="md:hidden absolute inset-0 w-full h-full">
          <Image
            src={collection.portraitImageUrl || collection.heroImageUrl || collection.squareImageUrl}
            alt={collection.name}
            fill
            className="object-cover object-center brightness-75 scale-105 animate-pulse [animation-duration:10s]"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center text-center text-white mt-20 px-4">
        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl tracking-widest uppercase mb-6 animate-slide-up opacity-0">
          {titleHtml}
        </h1>
        <p className="text-sm md:text-base font-light tracking-[0.2em] uppercase max-w-lg mb-10 animate-slide-up opacity-0 [animation-delay:200ms]">
          {collection.description}
        </p>
        <Link 
          href={`/collections/${collection.slug}`}
          className="px-10 py-4 bg-white text-black text-xs font-semibold tracking-[0.2em] uppercase hover:bg-white/90 hover:scale-105 transition-all duration-300 animate-slide-up opacity-0 [animation-delay:400ms]"
        >
          Explorar Coleção
        </Link>
      </div>
    </section>
  );
}
