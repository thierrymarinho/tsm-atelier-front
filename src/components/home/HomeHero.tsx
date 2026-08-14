import Image, { getImageProps } from "next/image";
import { cloudinaryUrl } from "@/lib/cloudinary-url";
import Link from "next/link";
import { CollectionResponseDTO, pickCollectionImage } from "@/lib/types/api";

interface HomeHeroProps {
  collection: CollectionResponseDTO | null;
}

export function HomeHero({ collection }: HomeHeroProps) {
  const desktopSrc = collection
    ? pickCollectionImage(collection, ["heroImageUrl", "portraitImageUrl", "squareImageUrl"])
    : null;
  const mobileSrc = collection
    ? pickCollectionImage(collection, ["portraitImageUrl", "heroImageUrl", "squareImageUrl"])
    : null;

  if (!collection || !desktopSrc || !mobileSrc) {
    return (
      <section className="relative h-[100dvh] w-full flex items-center justify-center overflow-hidden bg-zinc-900">
        <div className="relative z-10 flex flex-col items-center text-center text-white mt-20 px-4">
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl tracking-widest uppercase mb-6">
            {collection ? collection.name : "TSM Atelier"}
          </h1>
          <p className="text-sm md:text-base font-light tracking-[0.2em] uppercase max-w-lg mb-10">
            {collection?.description ?? "Welcome to the new era of luxury."}
          </p>
          {collection && (
            <Link
              href={`/collections/${collection.slug}`}
              className="px-10 py-4 bg-white text-black text-xs font-semibold tracking-[0.2em] uppercase hover:bg-white/90 hover:scale-105 transition-all duration-300"
            >
              Explorar Coleção
            </Link>
          )}
        </div>
      </section>
    );
  }

  const nameParts = collection.name.split(' ');
  const titleHtml = nameParts.length > 1
    ? <>{nameParts[0]} <br /> {nameParts.slice(1).join(' ')}</>
    : collection.name;

  return (
    <section className="relative h-[100dvh] w-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 w-full h-full">
        {desktopSrc === mobileSrc ? (
          <Image
            src={desktopSrc}
            alt={collection.name}
            fill
            sizes="100vw"
            className="object-cover object-center brightness-75 scale-105"
            priority
          />
        ) : (
          <HeroPicture desktopSrc={desktopSrc} mobileSrc={mobileSrc} alt={collection.name} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center text-white mt-20 px-4">
        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl tracking-widest uppercase mb-6 animate-slide-up opacity-0">
          {titleHtml}
        </h1>
        <p className="text-sm md:text-base font-light tracking-[0.2em] uppercase max-w-lg mb-10 animate-slide-up opacity-0 [animation-delay:200ms]">
          {collection.description}
        </p>
        <Link
          href={`/collections/${collection.slug}`}
          className="px-10 py-4 bg-white text-black text-xs font-semibold tracking-[0.2em] uppercase hover:bg-white/90 hover:scale-105 transition-all duration-300 animate-slide-up opacity-0 [animation-delay:400ms]"
        >
          Explorar Coleção
        </Link>
      </div>
    </section>
  );
}

function HeroPicture({
  desktopSrc,
  mobileSrc,
  alt,
}: {
  desktopSrc: string;
  mobileSrc: string;
  alt: string;
}) {
  const common = { alt, fill: true, sizes: "100vw", priority: true, loader: cloudinaryUrl } as const;
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({ ...common, src: desktopSrc });
  const {
    props: { srcSet: mobileSrcSet, ...imgProps },
  } = getImageProps({ ...common, src: mobileSrc });

  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktopSrcSet} sizes="100vw" />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt arrives via imgProps */}
      <img
        {...imgProps}
        srcSet={mobileSrcSet}
        fetchPriority="high"
        className="object-cover object-center brightness-75 scale-105"
      />
    </picture>
  );
}
