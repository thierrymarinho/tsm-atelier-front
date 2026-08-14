import { Loader2 } from "lucide-react";
import { getProducts } from "@/lib/api/server";
import { TargetAudience } from "@/lib/types/api";
import { ProductCard } from "./ProductCard";

interface CatalogGridProps {
  targetAudience?: TargetAudience;
  category?: string;
  collectionId?: number;
  onSale?: boolean;
  sort?: string;
  size?: number;
  emptyMessage?: string;
}

export function CatalogGridSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
      <Loader2 className="w-8 h-8 animate-spin mb-4" />
      <p className="tracking-widest uppercase text-sm">Carregando produtos...</p>
    </div>
  );
}

export async function CatalogGrid({
  targetAudience,
  category,
  collectionId,
  onSale,
  sort = "createdAt,desc",
  size = 20,
  emptyMessage = "Nenhum produto ainda foi adicionado para essa coleção.",
}: CatalogGridProps) {
  const products = await getProducts({ targetAudience, category, collectionId, onSale, sort, size });

  if (products === null) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        <p className="tracking-widest uppercase text-sm">Falha ao carregar catálogo de produtos.</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        <p className="tracking-widest uppercase text-sm">{emptyMessage}</p>
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
