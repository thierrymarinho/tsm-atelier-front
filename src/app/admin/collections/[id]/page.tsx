import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CollectionForm } from "@/components/admin/CollectionForm";

export const metadata: Metadata = {
  title: "Editar coleção | Painel TSM Atelier",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCollectionEditPage({ params }: PageProps) {
  const { id } = await params;
  const collectionId = Number(id);

  return (
    <>
      <Link
        href="/admin/collections"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
        Coleções
      </Link>

      <h1 className="font-serif text-lg md:text-2xl tracking-wide uppercase text-foreground mb-8">
        Editar coleção
      </h1>

      {Number.isInteger(collectionId) && collectionId > 0 ? (
        <CollectionForm collectionId={collectionId} />
      ) : (
        <p className="text-sm tracking-widest uppercase text-muted-foreground">
          Coleção não encontrada.
        </p>
      )}
    </>
  );
}
