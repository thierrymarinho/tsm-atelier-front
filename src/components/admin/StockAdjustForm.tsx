"use client";

import { useState } from "react";
import { Loader2, RotateCw } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { revalidateProducts } from "@/lib/api/revalidate";
import { formatAdminError, readProblem } from "@/lib/admin/errors";
import { STOCK_CHANGE_REASON_LABELS } from "@/lib/admin/stock";
import {
  STOCK_CHANGE_REASONS,
  type StockAdjustment,
  type StockChangeReason,
  type StockResponse,
} from "@/lib/types/admin";

const MODES = [
  {
    id: "delta",
    label: "Movimento",
    hint: "Entrou ou saiu esta quantidade",
    defaultReason: "RESTOCK",
  },
  {
    id: "count",
    label: "Contagem",
    hint: "Há esta quantidade na prateleira, agora",
    defaultReason: "INVENTORY_COUNT",
  },
] as const;

type Mode = (typeof MODES)[number]["id"];

interface StockAdjustFormProps {
  skuId: number;
  stockQuantity: number;
  version: number;
  onApplied: (result: StockResponse) => void;
  onStale: () => void;
}

export function StockAdjustForm({ skuId, stockQuantity, version, onApplied, onStale }: StockAdjustFormProps) {
  const [mode, setMode] = useState<Mode>("delta");

  const [value, setValue] = useState("");
  const [reason, setReason] = useState<StockChangeReason>("RESTOCK");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  const parsed = Number(value);
  const isNumber = value.trim() !== "" && value.trim() !== "-" && Number.isInteger(parsed);

  const isValid = mode === "delta" ? isNumber && parsed !== 0 : isNumber && parsed >= 0;

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setValue("");
    setReason(MODES.find((entry) => entry.id === next)!.defaultReason);
    setError(null);
    setIsStale(false);
  };

  const step = (by: 1 | -1) => {
    const from = isNumber ? parsed : 0;
    const next = mode === "count" ? Math.max(0, from + by) : from + by;
    setValue(String(next));
    setError(null);
  };

  const submit = async () => {
    if (!isValid || isSaving) return;
    setIsSaving(true);
    setError(null);
    setIsStale(false);
    try {
      const payload: StockAdjustment =
        mode === "delta" ? { delta: parsed, reason } : { absolute: parsed, version, reason };

      const response = await apiClient.patch<StockResponse>(`/v1/admin/skus/${skuId}/stock`, payload);
      setValue("");

      const previous = mode === "delta" ? response.data.stockQuantity - parsed : stockQuantity;
      if ((previous === 0) !== (response.data.stockQuantity === 0)) {
        void revalidateProducts();
      }

      onApplied(response.data);
    } catch (caught) {
      if (readProblem(caught)?.status === 409) {
        setIsStale(true);
        setError(
          "Este SKU mudou desde que a lista foi carregada — uma venda, ou outro ajuste. " +
            "Recarregue e confira o estoque antes de gravar a contagem.",
        );
      } else {
        setError(formatAdminError(caught, "Não foi possível ajustar o estoque."));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const active = MODES.find((entry) => entry.id === mode)!;

  return (
    <div className="flex flex-col gap-1.5">

      <div
        className="inline-flex self-start border border-muted text-[10px] uppercase tracking-[0.12em]"
        role="group"
        aria-label="Tipo de ajuste"
      >
        {MODES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            title={entry.hint}
            aria-pressed={mode === entry.id}
            onClick={() => switchMode(entry.id)}
            className={`px-2.5 py-1 transition-colors ${
              mode === entry.id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center border border-muted focus-within:border-foreground transition-colors">
          <button
            type="button"
            aria-label="Diminuir uma unidade"
            onClick={() => step(-1)}
            disabled={mode === "count" && isNumber && parsed <= 0}
            className="w-8 h-8 text-base leading-none text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            −
          </button>

          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(event) => {
              const next = event.target.value;
              const mask = mode === "delta" ? /^-?\d*$/ : /^\d*$/;
              if (next === "" || mask.test(next)) {
                setValue(next);
                setIsStale(false);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void submit();
                return;
              }
              if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                step(event.key === "ArrowUp" ? 1 : -1);
              }
            }}
            aria-label={
              mode === "delta"
                ? "Ajuste de estoque, positivo para entrada e negativo para saída"
                : "Quantidade contada na prateleira"
            }
            placeholder="0"
            className="w-14 h-8 bg-transparent text-sm text-center text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />

          <button
            type="button"
            aria-label="Aumentar uma unidade"
            onClick={() => step(1)}
            className="w-8 h-8 text-base leading-none text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            +
          </button>
        </div>

        <select
          value={reason}
          onChange={(event) => setReason(event.target.value as StockChangeReason)}
          aria-label="Motivo do ajuste"
          className="h-8 px-2 bg-transparent border border-muted text-sm text-foreground focus:outline-none focus:border-foreground transition-colors cursor-pointer"
        >
          {STOCK_CHANGE_REASONS.map((entry) => (
            <option key={entry} value={entry}>
              {STOCK_CHANGE_REASON_LABELS[entry]}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => void submit()}
          disabled={!isValid || isSaving}
          className="h-8 px-3 bg-foreground text-background text-[10px] font-semibold tracking-[0.15em] uppercase disabled:opacity-30 disabled:cursor-not-allowed hover:bg-foreground/90 transition-colors flex items-center gap-1.5"
        >
          {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
          Aplicar
        </button>
      </div>

      {!error && <p className="text-[10px] text-muted-foreground leading-snug">{active.hint}</p>}

      {error && (
        <div className="flex flex-col items-start gap-1">
          <p className="text-xs text-red-600 max-w-xs leading-snug">{error}</p>
          {isStale && (
            <button
              type="button"
              onClick={onStale}
              className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCw className="w-3 h-3" strokeWidth={1.5} />
              Recarregar e conferir
            </button>
          )}
        </div>
      )}
    </div>
  );
}
