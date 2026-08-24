import { notFound } from "next/navigation";
import {
  getAllProductSlugs,
  getProductBySlug,
  isCatalogReachable,
  withCatalogFallback,
} from "@/lib/api/server";
import { ProductDetails } from "@/components/domain/ProductDetails";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

// Gerar todas as páginas no build faz cada produto nascer com uma cópia no
// Full Route Cache — e é a cópia que segura um deep link durante a hibernação
// do backend. A sonda cobre o build com backend dormindo: sem ela, a lista de
// slugs sairia do Data Cache persistido, o prerender de cada página falharia
// e o deploy seria reprovado. Backend fora → geração sob demanda, como antes.
export async function generateStaticParams() {
  if (!(await isCatalogReachable())) return [];
  const slugs = await withCatalogFallback(getAllProductSlugs(), []);
  return slugs.map((slug) => ({ slug }));
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  // Sem try/catch de propósito: com o backend fora, renderizar qualquer coisa
  // aqui gravaria essa coisa no lugar da página real por toda a janela de
  // revalidação. Lançar descarta a tentativa e preserva a última cópia boa.
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
