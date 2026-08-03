"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { PaginatedResponse, ProductSummaryDTO, TargetAudience } from "@/lib/types/api";
import { ProductCard } from "./ProductCard";

interface CatalogGridProps {
  targetAudience?: TargetAudience;
  category?: string;
  collectionId?: number;
  sort?: string;
  size?: number;
}

export function CatalogGrid({ targetAudience, category, collectionId, sort = "createdAt,desc", size = 20 }: CatalogGridProps) {
  
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['products', { targetAudience, category, collectionId, sort, size }],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<ProductSummaryDTO>>('/v1/catalog/products', {
        params: {
          targetAudience,
          category,
          collectionId,
          sort,
          size
        }
      });
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="tracking-widest uppercase text-sm">Carregando produtos...</p>
      </div>
    );
  }

  if (isError || !pageData) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        <p className="tracking-widest uppercase text-sm">Falha ao carregar catálogo de produtos.</p>
      </div>
    );
  }

  const products = pageData.content || [];

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        <p className="tracking-widest uppercase text-sm">Nenhum produto ainda foi adicionado para essa coleção.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-14">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
