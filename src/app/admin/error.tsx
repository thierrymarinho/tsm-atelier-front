"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <RotateCcw className="w-12 h-12 text-muted-foreground/30 mb-6" strokeWidth={1} />

      <h1 className="font-serif text-xl md:text-2xl tracking-wide uppercase text-foreground">
        Algo deu errado
      </h1>

      <p className="mt-4 max-w-md text-sm text-muted-foreground leading-relaxed">
        Esta tela do painel não pôde ser carregada. Se o erro se repetir, o código abaixo identifica
        a ocorrência no servidor.
      </p>

      {error.digest && (
        <code className="mt-3 text-xs text-muted-foreground/70 tracking-wider">{error.digest}</code>
      )}

      <div className="mt-8 flex items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="px-6 py-3 bg-foreground text-background text-xs font-semibold tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors"
        >
          Tentar de novo
        </button>
        <Link
          href="/admin"
          className="text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          Voltar ao painel
        </Link>
      </div>
    </div>
  );
}
