"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  warning?: string;
  confirmLabel: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  warning,
  confirmLabel,
  isPending,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onCancel} aria-hidden="true" />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-md max-h-[85dvh] overflow-y-auto bg-background border border-muted shadow-xl p-5 sm:p-6">
          <h2 id="confirm-title" className="font-serif text-lg tracking-wide uppercase text-foreground">
            {title}
          </h2>

          <p
            id="confirm-description"
            className="mt-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line"
          >
            {description}
          </p>

          {warning && (
            <div className="mt-4 flex gap-3 border border-red-200 bg-red-50 p-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-700 mt-0.5" strokeWidth={2} />
              <p className="text-sm text-red-800 leading-relaxed">{warning}</p>
            </div>
          )}

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="px-5 py-2.5 text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className="px-5 py-2.5 bg-foreground text-background text-xs font-semibold tracking-[0.15em] uppercase hover:bg-foreground/90 transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
