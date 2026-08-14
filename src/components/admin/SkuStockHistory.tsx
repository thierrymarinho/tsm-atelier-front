"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { formatServerDateTime } from "@/lib/utils/format";
import { describeAuditChange, describeAuditReason } from "@/lib/admin/audit";
import type { AuditLogResponse } from "@/lib/types/admin";
import type { PaginatedResponse } from "@/lib/types/api";

const ROWS = 8;

interface SkuStockHistoryProps {
  skuId: number;
}

export function SkuHistoryToggle({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
    >
      <History className="w-3 h-3" strokeWidth={1.5} />
      {isOpen ? "Ocultar" : "Histórico"}
    </button>
  );
}

export function SkuStockHistory({ skuId }: SkuStockHistoryProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "audit", "sku", skuId],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<PaginatedResponse<AuditLogResponse>>("/v1/admin/audit", {
        params: {
          entityType: "PRODUCT_SKU",
          entityId: String(skuId),
          size: ROWS,
          sort: "createdAt,desc",
        },
        signal,
      });
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Carregando histórico…
      </p>
    );
  }

  if (isError || !data) {
    return <p className="text-xs text-red-600">Falha ao carregar o histórico deste SKU.</p>;
  }

  const entries = data.content;

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
        Nenhum ajuste registrado para este SKU. O estoque atual vem da criação do produto e das
        vendas — o histórico só guarda o que foi feito pelo painel.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col">
        {entries.map((entry) => {
          const change = describeAuditChange(entry);
          const reason = describeAuditReason(entry);
          return (
            <li
              key={entry.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5 border-b border-muted/40 last:border-b-0 text-xs"
            >
              <span className="text-muted-foreground tabular-nums">
                {formatServerDateTime(entry.createdAt)}
              </span>

              {change && <span className="text-foreground font-medium">{change}</span>}

              {reason && (
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {reason}
                </span>
              )}

              <span className="text-muted-foreground truncate">{entry.actor}</span>
            </li>
          );
        })}
      </ul>

      {data.page.totalElements > entries.length && (
        <p className="text-[11px] text-muted-foreground">
          Mostrando os {entries.length} mais recentes de {data.page.totalElements}. O restante está em{" "}
          <Link
            href={`/admin/audit?entityType=PRODUCT_SKU&entityId=${skuId}`}
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            histórico
          </Link>
          .
        </p>
      )}
    </div>
  );
}
