import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { AuditContent } from "./AuditContent";

export const metadata: Metadata = {
  title: "Histórico | Painel TSM Atelier",
  robots: { index: false, follow: false },
};

export default function AdminAuditPage() {
  return (
    <>
      <h1 className="font-serif text-lg md:text-2xl tracking-wide uppercase text-foreground mb-2">
        Histórico
      </h1>
      <p className="text-sm text-muted-foreground mb-8 max-w-2xl leading-relaxed">
        Quem fez, o quê, em qual registro e quando. Somente leitura — não existe rota que altere uma
        linha daqui, e é isso que faz o rastro valer alguma coisa.
      </p>

      <Suspense
        fallback={
          <div className="min-h-[40vh] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <AuditContent />
      </Suspense>
    </>
  );
}
