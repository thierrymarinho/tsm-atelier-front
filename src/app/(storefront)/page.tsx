import { HomeHero } from "@/components/home/HomeHero";
import { SecondaryCollections } from "@/components/home/SecondaryCollections";
import { NewArrivalsCarousel } from "@/components/home/NewArrivalsCarousel";
import {
  getCollectionByPosition,
  getCollectionsByPosition,
  getProducts,
  withCatalogFallback,
} from "@/lib/api/server";

// A home é prerenderizada e revalidada a cada 5 minutos, então o visitante
// recebe a cópia em cache enquanto o backend acorda — ele nunca vê o cold
// start. Degradar em vez de lançar também impede que um backend fora derrube o
// build de produção.
export default async function HomePage() {
  const [heroCollection, newArrivals, secondaryCollections] = await Promise.all([
    withCatalogFallback(getCollectionByPosition("HOME_MAIN"), null),
    withCatalogFallback(getProducts({ targetAudience: "WOMEN", sort: "createdAt,desc", size: 8 }), []),
    withCatalogFallback(getCollectionsByPosition("HOME_SECONDARY"), []),
  ]);

  return (
    <div className="flex flex-col w-full min-h-screen">
      <HomeHero collection={heroCollection} />
      <NewArrivalsCarousel initialProducts={newArrivals ?? []} />
      <SecondaryCollections collections={secondaryCollections} />
    </div>
  );
}
