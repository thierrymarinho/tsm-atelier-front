import { CatalogGrid } from "@/components/domain/CatalogGrid";
import { TargetAudience } from "@/lib/types/api";
import { translateCategory, translateTargetAudience } from "@/lib/utils/translations";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CatalogPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const categoryRaw = resolvedSearchParams.category as string | undefined;
  const targetAudienceRaw = resolvedSearchParams.targetAudience as TargetAudience | undefined;

  // Determine Title based on params
  let title = "Catálogo";
  if (categoryRaw && targetAudienceRaw) {
    title = `${translateCategory(categoryRaw)} - ${translateTargetAudience(targetAudienceRaw)}`;
  } else if (categoryRaw) {
    title = translateCategory(categoryRaw);
  } else if (targetAudienceRaw) {
    title = translateTargetAudience(targetAudienceRaw);
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20 mt-16 sm:mt-20">
      <div className="mb-10 md:mb-16 text-center">
        <h1 className="font-serif text-3xl md:text-5xl tracking-wide uppercase text-foreground mb-4">
          {title}
        </h1>
        {targetAudienceRaw === 'WOMEN' && !categoryRaw && (
          <p className="text-muted-foreground tracking-widest text-sm uppercase">
            Descubra nossa coleção feminina
          </p>
        )}
        {targetAudienceRaw === 'MEN' && !categoryRaw && (
          <p className="text-muted-foreground tracking-widest text-sm uppercase">
            Descubra nossa coleção masculina
          </p>
        )}
      </div>

      <CatalogGrid 
        targetAudience={targetAudienceRaw}
        category={categoryRaw}
        size={20} 
        sort="createdAt,desc" 
      />
    </div>
  );
}
