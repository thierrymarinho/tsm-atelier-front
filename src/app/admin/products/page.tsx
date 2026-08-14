import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { ProductsContent } from "./ProductsContent";

export const metadata: Metadata = {
  title: "Produtos | Painel TSM Atelier",
  robots: { index: false, follow: false },
};

export default function AdminProductsPage() {
  return (
    <>
      <h1 className="font-serif text-lg md:text-2xl tracking-wide uppercase text-foreground mb-2">
        Produtos
      </h1>
      <p className="text-sm text-muted-foreground mb-8 max-w-2xl leading-relaxed">
        A única listagem que enxerga peças fora do ar e removidas.
      </p>

      <Suspense
        fallback={
          <div className="min-h-[40vh] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <ProductsContent />
      </Suspense>
    </>
  );
}
