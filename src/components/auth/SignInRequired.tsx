"use client";

import { Lock } from "lucide-react";
import { useAuthPanel } from "@/lib/context/AuthPanelContext";

interface SignInRequiredProps {
  title: string;
  description: string;
}

export function SignInRequired({ title, description }: SignInRequiredProps) {
  const { openAuthPanel } = useAuthPanel();

  return (
    <div className="flex-1 w-full min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <Lock className="w-8 h-8 text-muted-foreground mb-6" strokeWidth={1.25} />

      <h1 className="font-serif text-2xl md:text-3xl tracking-widest uppercase text-foreground mb-4">
        {title}
      </h1>

      <p className="text-muted-foreground text-sm max-w-md mb-10 leading-relaxed">
        {description}
      </p>

      <button
        type="button"
        onClick={openAuthPanel}
        className="px-10 py-3 bg-foreground text-background text-xs tracking-widest uppercase transition-opacity hover:opacity-80"
      >
        Entrar
      </button>
    </div>
  );
}
