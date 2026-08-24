import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CatalogGrid, CatalogGridSkeleton } from "@/components/domain/CatalogGrid";
import {
  getAllCollections,
  getCollectionBySlug,
  isCatalogReachable,
  withCatalogFallback,
} from "@/lib/api/server";
import { TargetAudience } from "@/lib/types/api";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

// Mesmo racional da página de produto: toda coleção nasce com cópia no build,
// e a sonda faz um backend dormindo degradar para geração sob demanda em vez
// de reprovar o deploy. As duas rotas de novidades não existem na API — a
// própria página não a consulta, e o grid delas degrada sozinho no build —
// então nascem sempre, mesmo com o backend fora.
export async function generateStaticParams() {
  const virtual = [{ slug: "novidades-mulheres" }, { slug: "novidades-homens" }];
  if (!(await isCatalogReachable())) return virtual;

  const collections = await withCatalogFallback(getAllCollections(), []);
  return [
    ...virtual,
    ...collections
      .filter((collection) => collection.active)
      .map((collection) => ({ slug: collection.slug })),
  ];
}

export default async function CollectionPage({ params }: PageProps) {
  const { slug } = await params;

  let title = "";
  let targetAudience: TargetAudience | undefined;
  let isNovidades = false;
  let collectionId: number | undefined;

  if (slug === "novidades-mulheres") {
    title = "Novidades para Ela";
    targetAudience = "WOMEN";
    isNovidades = true;
  } else if (slug === "novidades-homens") {
    title = "Novidades para Ele";
    targetAudience = "MEN";
    isNovidades = true;
  } else {
    // Sem try/catch: backend fora tem que lançar para a revalidação falhada
    // ser descartada e a cópia boa continuar no ar (ver CatalogGrid).
    const collectionData = await getCollectionBySlug(slug);

    if (!collectionData || !collectionData.active) {
      notFound();
    }

    title = collectionData.name;
    targetAudience = collectionData.targetAudience;
    collectionId = collectionData.id;
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 md:pt-10 pb-12 md:pb-20 mt-16 sm:mt-20">
      <div className="mb-10 md:mb-16 text-center">
        <h1 className="font-serif text-lg md:text-2xl tracking-wide uppercase text-foreground mb-4">
          {title}
        </h1>
        {isNovidades && (
          <p className="text-muted-foreground tracking-widest text-sm uppercase">
            Descubra as últimas novidades
          </p>
        )}
      </div>

      <Suspense fallback={<CatalogGridSkeleton />}>
        <CatalogGrid
          targetAudience={targetAudience}
          collectionId={collectionId}
          size={20}
          sort="createdAt,desc"
        />
      </Suspense>
    </div>
  );
}
