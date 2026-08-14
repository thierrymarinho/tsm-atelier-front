"use client";

import { AlertCircle } from "lucide-react";
import { useAuthPanel } from "@/lib/context/AuthPanelContext";

export function ExpiredSessionNotice() {
  const { openAuthPanel } = useAuthPanel();

  return (
    <div className="flex items-start gap-3 border border-red-500/40 bg-red-500/5 p-4 mb-8">
      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
      <div className="flex flex-col gap-2 text-sm">
        <p className="text-foreground">
          Sua sessão expirou. Seu carrinho está guardado na sua conta.
        </p>
        <button
          type="button"
          onClick={openAuthPanel}
          className="self-start text-xs uppercase tracking-widest font-semibold border-b border-foreground pb-0.5 hover:opacity-70 transition-opacity"
        >
          Entrar novamente
        </button>
      </div>
    </div>
  );
}
