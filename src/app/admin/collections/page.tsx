import type { Metadata } from "next";
import { CollectionsContent } from "./CollectionsContent";

export const metadata: Metadata = {
  title: "Coleções | Painel TSM Atelier",
  robots: { index: false, follow: false },
};

export default function AdminCollectionsPage() {
  return (
    <>
      <h1 className="font-serif text-lg md:text-2xl tracking-wide uppercase text-foreground mb-8">
        Coleções
      </h1>

      <CollectionsContent />
    </>
  );
}
