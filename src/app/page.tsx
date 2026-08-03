import { HomeHero } from "@/components/home/HomeHero";
import { SecondaryCollections } from "@/components/home/SecondaryCollections";
import { NewArrivalsCarousel } from "@/components/home/NewArrivalsCarousel";

export default function HomePage() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      <HomeHero />
      <NewArrivalsCarousel />
      <SecondaryCollections />
    </div>
  );
}
