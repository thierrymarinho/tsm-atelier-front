import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogGridSkeleton } from "@/components/domain/CatalogGrid";
import { SearchContent } from "./SearchContent";

export const metadata: Metadata = {
  title: "Buscar | TSM Atelier",
  description: "Encontre peças por categoria, seção, preço e coleção.",
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 md:pt-10 pb-12 md:pb-20 mt-16 sm:mt-20">

      <h1 className="sr-only">Buscar</h1>

      <Suspense fallback={<CatalogGridSkeleton />}>
        <SearchContent />
      </Suspense>
    </div>
  );
}
