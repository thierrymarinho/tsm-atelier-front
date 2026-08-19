"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { ColdStartNotice } from "@/components/domain/ColdStartNotice";
import { CATALOG_UNAVAILABLE_DIGEST } from "@/lib/catalog-unavailable";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  if (error.digest === CATALOG_UNAVAILABLE_DIGEST) {
    return <ColdStartNotice reset={reset} />;
  }

  return (
    <div className="flex-1 w-full min-h-[70vh] flex flex-col items-center justify-center px-4 text-center mt-16 sm:mt-20">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="flex justify-center text-muted-foreground/30 mb-8">
          <RotateCcw className="w-20 h-20" strokeWidth={1} />
        </div>

        <h1 className="font-serif text-2xl md:text-3xl tracking-widest uppercase text-foreground">
          Algo deu errado
        </h1>

        <p className="text-muted-foreground tracking-wide text-sm md:text-base leading-relaxed max-w-md mx-auto">
          Não foi possível carregar esta página. Tente novamente em alguns instantes.
        </p>

        {error.digest && (
          <p className="text-[10px] tracking-widest uppercase text-muted-foreground/60 font-mono">
            Ref: {error.digest}
          </p>
        )}

        <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-8 py-4 bg-foreground text-background text-xs font-semibold tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors"
          >
            Tentar novamente
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-8 py-4 border border-foreground text-foreground text-xs font-semibold tracking-[0.2em] uppercase hover:bg-muted/30 transition-colors"
          >
            Voltar para a Home
          </Link>
        </div>
      </div>
    </div>
  );
}
