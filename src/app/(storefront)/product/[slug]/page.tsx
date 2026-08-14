import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/api/server";
import { ProductDetails } from "@/components/domain/ProductDetails";

interface PageProps {
  params: Promise<{ slug: string }>;
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
