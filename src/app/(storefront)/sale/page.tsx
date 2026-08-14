import { Suspense } from "react";
import { CatalogGrid, CatalogGridSkeleton } from "@/components/domain/CatalogGrid";

export default function SalePage() {
  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 md:pt-10 pb-12 md:pb-20 mt-16 sm:mt-20">
      <div className="mb-10 md:mb-16 text-center">
        <h1 className="font-serif text-lg md:text-2xl tracking-wide uppercase text-red-600 mb-4">
          Sale
        </h1>
        <p className="text-muted-foreground tracking-widest text-sm uppercase">
          Peças selecionadas com preço especial
        </p>
      </div>

      <Suspense fallback={<CatalogGridSkeleton />}>
        <CatalogGrid
          onSale
          size={20}
          sort="createdAt,desc"
          emptyMessage="Nenhuma peça em promoção no momento."
        />
      </Suspense>
    </div>
  );
}
