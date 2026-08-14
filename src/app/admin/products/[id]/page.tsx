import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata: Metadata = {
  title: "Editar produto | Painel TSM Atelier",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminProductEditPage({ params }: PageProps) {
  const { id } = await params;
  const productId = Number(id);

  return (
    <>
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
        Produtos
      </Link>

      <h1 className="font-serif text-lg md:text-2xl tracking-wide uppercase text-foreground mb-8">
        Editar produto
      </h1>

      {Number.isInteger(productId) && productId > 0 ? (
        <ProductForm productId={productId} />
      ) : (
        <p className="text-sm tracking-widest uppercase text-muted-foreground">
          Produto não encontrado.
        </p>
      )}
    </>
  );
}
