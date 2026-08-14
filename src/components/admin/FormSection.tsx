"use client";

import { AlertCircle, Check } from "lucide-react";
import type { FormSectionSpec, SectionState } from "@/lib/admin/form-section";

export function sectionAnchor(id: string): string {
  return `secao-${id}`;
}

function StateMark({ state }: { state: SectionState }) {
  if (state === "error") {
    return (
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-red-600">
        <AlertCircle className="w-3.5 h-3.5" strokeWidth={2} />
        <span className="sr-only">Seção com erro</span>
      </span>
    );
  }

  if (state === "done") {
    return (
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-foreground">
        <Check className="w-3.5 h-3.5" strokeWidth={2} />
        <span className="sr-only">Seção preenchida</span>
      </span>
    );
  }

  return (
    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50" aria-hidden>
      —
    </span>
  );
}

export function FormSection({
  spec,
  state,
  children,
}: {
  spec: FormSectionSpec;
  state: SectionState;
  children: React.ReactNode;
}) {
  return (
    <section
      id={sectionAnchor(spec.id)}
      aria-labelledby={`${sectionAnchor(spec.id)}-titulo`}
      className={`scroll-mt-20 border transition-colors ${
        state === "error" ? "border-red-300" : "border-muted"
      }`}
    >
      <header className="flex items-baseline gap-3 px-4 sm:px-5 py-4 border-b border-muted">
        <span
          className={`flex-shrink-0 text-xs tabular-nums ${
            state === "error" ? "text-red-600" : "text-muted-foreground"
          }`}
          aria-hidden
        >
          {spec.number}
        </span>

        <div className="flex-1 min-w-0">
          <h2
            id={`${sectionAnchor(spec.id)}-titulo`}
            className="text-xs uppercase tracking-widest text-foreground"
          >
            {spec.title}
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{spec.hint}</p>
        </div>

        <StateMark state={state} />
      </header>

      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
