import { notFound } from "next/navigation";
import { ProductResponseDTO } from "@/lib/types/api";
import { ProductDetails } from "@/components/domain/ProductDetails";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getProductBySlug(slug: string): Promise<ProductResponseDTO | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const res = await fetch(`${apiUrl}/api/v1/catalog/products/slug/${slug}`, {
      next: { revalidate: 60 }
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(`Error fetching product ${slug}:`, error);
    return null;
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="w-full">
      <ProductDetails product={product} />
    </div>
  );
}
