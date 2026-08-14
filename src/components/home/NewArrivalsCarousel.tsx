"use client";

import { useState, useRef } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { ProductSummaryDTO, PaginatedResponse } from "@/lib/types/api";
import { ProductCard } from "@/components/domain/ProductCard";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

type Filter = "WOMEN" | "MEN";

const DEFAULT_FILTER: Filter = "WOMEN";

interface NewArrivalsCarouselProps {
  initialProducts: ProductSummaryDTO[];
}

export function NewArrivalsCarousel({ initialProducts }: NewArrivalsCarouselProps) {
  const [activeFilter, setActiveFilter] = useState<Filter>(DEFAULT_FILTER);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data: products, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['products', 'new-arrivals', activeFilter],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<ProductSummaryDTO>>('/v1/catalog/products', {
        params: {
          targetAudience: activeFilter,
          sort: 'createdAt,desc',
          size: 8
        }
      });
      return response.data.content;
    },
    initialData: activeFilter === DEFAULT_FILTER ? initialProducts : undefined,
    placeholderData: keepPreviousData,
  });

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current && scrollContainerRef.current.children.length > 0) {
      const container = scrollContainerRef.current;
      const firstItem = container.children[0] as HTMLElement;

      const scrollAmount = direction === 'left' ? -firstItem.offsetWidth : firstItem.offsetWidth;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full py-16 md:py-24 bg-background">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 gap-6">
          <h2 className="font-serif text-xl sm:text-2xl tracking-widest uppercase text-foreground">
            Lançamentos
          </h2>

          <div className="flex items-center gap-6">
            {(["WOMEN", "MEN"] as Filter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`text-sm tracking-widest uppercase font-medium pb-1 transition-all ${
                  activeFilter === filter
                    ? "text-foreground border-b border-foreground"
                    : "text-muted-foreground border-b border-transparent hover:text-foreground"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`relative group/carousel transition-opacity duration-200 ${
            isPlaceholderData ? "opacity-50" : "opacity-100"
          }`}
        >
          {isLoading ? (
            <div className="w-full h-[400px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !products || products.length === 0 ? (
            <div className="w-full h-[400px] flex items-center justify-center bg-muted/10 text-muted-foreground text-sm tracking-widest uppercase">
              No products found
            </div>
          ) : (
            <>
              <button
                onClick={() => scroll('left')}
                className="absolute left-4 top-[40%] -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 disabled:opacity-0 hover:scale-105"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5 text-black" strokeWidth={1.5} />
              </button>

              <button
                onClick={() => scroll('right')}
                className="absolute right-4 top-[40%] -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 disabled:opacity-0 hover:scale-105"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5 text-black" strokeWidth={1.5} />
              </button>

              <div
                ref={scrollContainerRef}

                className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-proximity pb-4 -mx-4 px-4 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0 [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="w-[calc(50%-8px)] sm:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] flex-shrink-0 snap-start"
                  >
                    <ProductCard product={product} isNewBadge={true} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
