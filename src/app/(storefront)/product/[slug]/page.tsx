import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, isCatalogUnavailable } from "@/lib/api/server";
import { ProductDetails } from "@/components/domain/ProductDetails";
import { ColdStartNotice } from "@/components/domain/ColdStartNotice";
import type { ProductResponseDTO } from "@/lib/types/api";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// O aviso de cold start responde 200, então sem isto um crawler que chegasse
// com o backend dormindo poderia indexar o aviso como sendo a página do
// produto. Uma tag <meta> renderizada pelo próprio aviso não serviria: a essa
// altura o <head> já foi despachado, e robots no body é ignorado.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    await getProductBySlug(slug);
    return {};
  } catch (error) {
    if (isCatalogUnavailable(error)) return { robots: { index: false } };
    throw error;
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  let product: ProductResponseDTO | null;
  try {
    product = await getProductBySlug(slug);
  } catch (error) {
    if (isCatalogUnavailable(error)) return <ColdStartNotice />;
    throw error;
  }

  if (!product) {
    notFound();
  }

  return (
    <div className="w-full">
      <ProductDetails product={product} />
    </div>
  );
}
