import Link from "next/link";
import { Search } from "lucide-react";
import { StorefrontShell } from "@/components/layout/StorefrontShell";

export default function NotFound() {
  return (
    <StorefrontShell>
    <div className="flex-1 w-full min-h-[70vh] flex flex-col items-center justify-center px-4 text-center mt-16 sm:mt-20">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="flex justify-center text-muted-foreground/30 mb-8">
          <Search className="w-20 h-20" strokeWidth={1} />
        </div>

        <h1 className="font-serif text-4xl md:text-6xl tracking-wide text-foreground">
          404
        </h1>

        <h2 className="font-serif text-2xl md:text-3xl tracking-widest uppercase text-foreground/80">
          Página não encontrada
        </h2>

        <p className="text-muted-foreground tracking-widest text-sm md:text-base leading-relaxed uppercase max-w-md mx-auto">
          A coleção ou página que você tentou acessar não existe ou não está mais disponível.
        </p>

        <div className="pt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-8 py-4 bg-foreground text-background text-xs font-semibold tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors"
          >
            Voltar para a Home
          </Link>
        </div>
      </div>
    </div>
    </StorefrontShell>
  );
}
