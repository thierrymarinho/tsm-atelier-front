import { Loader2 } from "lucide-react";
import { getProducts, withCatalogFallback } from "@/lib/api/server";
import { TargetAudience } from "@/lib/types/api";
import { ProductCard } from "./ProductCard";
import { ColdStartNotice } from "./ColdStartNotice";

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
  // No runtime de produção o withCatalogFallback relança, e é isso que
  // protege o cache: renderizar o aviso contaria como página válida e seria
  // gravado por cima da cópia boa pela janela inteira; lançando, a revalidação
  // falhada é descartada e a última cópia segue no ar (rotas dinâmicas caem no
  // error.tsx, que mostra o aviso com retry). O null só acontece no build e em
  // dev, onde não existe cópia para proteger — aí o aviso vira o conteúdo
  // inicial e o retry dele o troca pela página real quando o backend acordar.
  const products = await withCatalogFallback(
    getProducts({ targetAudience, category, collectionId, onSale, sort, size }),
    null,
  );

  if (products === null) return <ColdStartNotice />;

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
