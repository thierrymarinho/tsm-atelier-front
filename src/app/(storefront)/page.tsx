import { HomeHero } from "@/components/home/HomeHero";
import { SecondaryCollections } from "@/components/home/SecondaryCollections";
import { NewArrivalsCarousel } from "@/components/home/NewArrivalsCarousel";
import {
  getCollectionByPosition,
  getCollectionsByPosition,
  getProducts,
} from "@/lib/api/server";

export default async function HomePage() {
  const [heroCollection, newArrivals, secondaryCollections] = await Promise.all([
    getCollectionByPosition("HOME_MAIN"),
    getProducts({ targetAudience: "WOMEN", sort: "createdAt,desc", size: 8 }),
    getCollectionsByPosition("HOME_SECONDARY"),
  ]);

  return (
    <div className="flex flex-col w-full min-h-screen">
      <HomeHero collection={heroCollection} />
      <NewArrivalsCarousel initialProducts={newArrivals ?? []} />
      <SecondaryCollections collections={secondaryCollections} />
    </div>
  );
}
