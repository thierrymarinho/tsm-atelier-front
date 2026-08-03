import { notFound } from "next/navigation";
import { CatalogGrid } from "@/components/domain/CatalogGrid";
import { TargetAudience, CollectionResponseDTO } from "@/lib/types/api";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getCollectionBySlug(slug: string): Promise<CollectionResponseDTO | null> {
  try {
    // In a server component, we fetch directly from the backend API.
    // Ensure this URL matches your internal Docker network or localhost setup.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const res = await fetch(`${apiUrl}/api/v1/catalog/collections/slug/${slug}`, {
      next: { revalidate: 60 } // Optional ISR cache
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(`Error fetching collection ${slug}:`, error);
    return null;
  }
}

export default async function CollectionPage({ params }: PageProps) {
  const { slug } = await params;

  let title = "";
  let targetAudience: TargetAudience | undefined;
  let isNovidades = false;
  let collectionId: number | undefined;

  // Handle hardcoded "Novidades" dynamic routes
  if (slug === "novidades-mulheres") {
    title = "Novidades para Ela";
    targetAudience = "WOMEN";
    isNovidades = true;
  } else if (slug === "novidades-homens") {
    title = "Novidades para Ele";
    targetAudience = "MEN";
    isNovidades = true;
  } else {
    // Standard Collection Route
    const collectionData = await getCollectionBySlug(slug);
    
    if (!collectionData) {
      notFound();
    }

    title = collectionData.name;
    targetAudience = collectionData.targetAudience;
    collectionId = collectionData.id;
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20 mt-16 sm:mt-20">
      <div className="mb-10 md:mb-16 text-center">
        <h1 className="font-serif text-3xl md:text-5xl tracking-wide uppercase text-foreground mb-4">
          {title}
        </h1>
        {isNovidades && (
          <p className="text-muted-foreground tracking-widest text-sm uppercase">
            Descubra as últimas novidades
          </p>
        )}
      </div>

      <CatalogGrid 
        targetAudience={targetAudience}
        collectionId={collectionId}
        size={20} 
        sort="createdAt,desc" 
      />
    </div>
  );
}
