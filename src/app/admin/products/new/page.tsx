import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata: Metadata = {
  title: "Novo produto | Painel TSM Atelier",
  robots: { index: false, follow: false },
};

export default function NewProductPage() {
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
        Novo produto
      </h1>

      <ProductForm />
    </>
  );
}
