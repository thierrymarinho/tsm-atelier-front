"use client";

import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/context/AuthContext";
import { StockAdjustForm } from "@/components/admin/StockAdjustForm";
import { SkuHistoryToggle, SkuStockHistory } from "@/components/admin/SkuStockHistory";
import type {
  AdminProductResponse,
  AdminProductSummary,
  StockResponse,
} from "@/lib/types/admin";

interface ProductStockPanelProps {
  productId: number;
  summary?: Pick<AdminProductSummary, "name" | "active" | "deletedAt">;
  defaultOpen?: boolean;
  onApplied: (result: StockResponse) => void;
}

export function ProductStockPanel({
  productId,
  summary,
  defaultOpen = false,
  onApplied,
}: ProductStockPanelProps) {
  const { canWrite } = useAuth();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const { data, error, isLoading, isError, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["admin", "product", productId],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<AdminProductResponse>(
        `/v1/admin/products/${productId}`,
        { signal },
      );
      return response.data;
    },
    enabled: isOpen,
  });

  const [applied, setApplied] = useState<
    Record<number, { quantity: number; version: number }>
  >({});

  const [historyFor, setHistoryFor] = useState<number | null>(null);

  const [syncedUpdatedAt, setSyncedUpdatedAt] = useState(dataUpdatedAt);
  if (syncedUpdatedAt !== dataUpdatedAt) {
    setSyncedUpdatedAt(dataUpdatedAt);
    if (Object.keys(applied).length > 0) setApplied({});
  }

  const handleApplied = (result: StockResponse) => {
    setApplied((current) => ({
      ...current,
      [result.skuId]: { quantity: result.stockQuantity, version: result.version },
    }));
    onApplied(result);
  };

  const colors = (data?.colors ?? []).filter((color) => color.deletedAt === null);
  const liveColors = colors
    .map((color) => ({ ...color, skus: color.skus.filter((sku) => sku.deletedAt === null) }))
    .filter((color) => color.skus.length > 0);

  const hiddenCount = data
    ? data.colors.reduce((sum, color) => sum + color.skus.length, 0) -
      liveColors.reduce((sum, color) => sum + color.skus.length, 0)
    : 0;

  const name = summary?.name ?? data?.name;
  const active = summary?.active ?? data?.active;
  const isGone = (summary !== undefined ? summary.deletedAt : (data?.deletedAt ?? null)) !== null;

  const isMissing =
    summary === undefined && error instanceof ApiError && error.response?.status === 404;

  const fallbackTitle = isMissing
    ? `Produto #${productId} não encontrado`
    : isError
      ? `Produto #${productId}`
      : "Carregando…";

  return (
    <div className="border-b border-muted/60">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-3 py-3 text-left hover:bg-muted/20 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" strokeWidth={1.5} />
        ) : (
          <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground" strokeWidth={1.5} />
        )}

        <span className={`text-sm ${isGone ? "text-muted-foreground line-through" : "text-foreground"}`}>
          {name ?? fallbackTitle}
        </span>

        {isGone ? (
          <span className="text-[10px] uppercase tracking-widest text-red-600">removido</span>
        ) : (
          active === false && (
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              inativo
            </span>
          )
        )}

        {isOpen && isLoading && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-auto" />
        )}
      </button>

      {isOpen && (
        <div className="pb-5 pl-7">
          {isError ? (
            <p className="text-sm text-red-600">
              {isMissing
                ? `Nenhum produto com o id ${productId}. Confira o endereço ou busque pelo nome acima.`
                : "Falha ao carregar os SKUs deste produto."}
            </p>
          ) : isLoading ? (
            <p className="text-xs text-muted-foreground">Carregando SKUs…</p>
          ) : liveColors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este produto não tem SKU ativo.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {liveColors.map((color) => (
                <div key={color.id}>
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="w-3 h-3 rounded-full border border-muted flex-shrink-0"
                      style={{ backgroundColor: color.colorHex }}
                    />
                    <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      {color.colorName}
                    </span>
                  </div>

                  <div className="mt-3 hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[620px] text-sm">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-muted-foreground border-b border-muted">
                          <th className="py-2 pr-4 font-normal">Tam.</th>
                          <th className="py-2 pr-4 font-normal">SKU</th>
                          <th className="py-2 pr-4 font-normal">Estoque</th>
                          {canWrite && <th className="py-2 font-normal">Ajustar</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {color.skus.map((sku) => {
                          const adjusted = applied[sku.id];
                          const current = adjusted?.quantity ?? sku.stockQuantity;
                          const version = adjusted?.version ?? sku.version;
                          const showHistory = historyFor === sku.id;
                          return (
                            <Fragment key={sku.id}>
                              <tr className="border-b border-muted/40 align-middle">
                                <td className="py-3 pr-4 text-muted-foreground">{sku.size}</td>
                                <td className="py-3 pr-4 text-muted-foreground font-mono text-xs">
                                  {sku.skuCode}
                                </td>
                                <td className="py-3 pr-4">
                                  <span
                                    className={`inline-flex items-center gap-1.5 font-medium ${
                                      current === 0 ? "text-red-600" : "text-foreground"
                                    }`}
                                  >
                                    {current === 0 && (
                                      <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
                                    )}
                                    {current}
                                  </span>
                                  {adjusted && (
                                    <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                                      atualizado
                                    </span>
                                  )}
                                  <SkuHistoryToggle
                                    isOpen={showHistory}
                                    onToggle={() => setHistoryFor(showHistory ? null : sku.id)}
                                  />
                                </td>
                                {canWrite && (
                                  <td className="py-3">
                                    <StockAdjustForm
                                      skuId={sku.id}
                                      stockQuantity={current}
                                      version={version}
                                      onApplied={handleApplied}
                                      onStale={() => void refetch()}
                                    />
                                  </td>
                                )}
                              </tr>

                              {showHistory && (
                                <tr className="border-b border-muted/40">
                                  <td colSpan={canWrite ? 4 : 3} className="pb-4 pt-1">
                                    <SkuStockHistory skuId={sku.id} />
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <ul className="mt-3 md:hidden flex flex-col gap-3">
                    {color.skus.map((sku) => {
                      const adjusted = applied[sku.id];
                      const current = adjusted?.quantity ?? sku.stockQuantity;
                      const version = adjusted?.version ?? sku.version;
                      const showHistory = historyFor === sku.id;
                      return (
                        <li key={sku.id} className="border border-muted p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <span className="block text-sm text-foreground">{sku.size}</span>
                              <span className="block text-[11px] text-muted-foreground font-mono">
                                {sku.skuCode}
                              </span>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <span
                                className={`inline-flex items-center gap-1.5 text-lg font-medium ${
                                  current === 0 ? "text-red-600" : "text-foreground"
                                }`}
                              >
                                {current === 0 && (
                                  <AlertTriangle className="w-4 h-4" strokeWidth={2} />
                                )}
                                {current}
                              </span>
                              {adjusted && (
                                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                                  atualizado
                                </span>
                              )}
                              <SkuHistoryToggle
                                isOpen={showHistory}
                                onToggle={() => setHistoryFor(showHistory ? null : sku.id)}
                              />
                            </div>
                          </div>

                          {canWrite && (
                            <div className="mt-3 pt-3 border-t border-muted/60">
                              <StockAdjustForm
                                skuId={sku.id}
                                stockQuantity={current}
                                version={version}
                                onApplied={handleApplied}
                                onStale={() => void refetch()}
                              />
                            </div>
                          )}

                          {showHistory && (
                            <div className="mt-3">
                              <SkuStockHistory skuId={sku.id} />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              {hiddenCount > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {hiddenCount} {hiddenCount === 1 ? "SKU removido não é listado" : "SKUs removidos não são listados"}.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
