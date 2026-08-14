"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, RotateCw, Search } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { StockAdjustForm } from "@/components/admin/StockAdjustForm";
import { ProductStockPanel } from "@/components/admin/ProductStockPanel";
import { SkuHistoryToggle, SkuStockHistory } from "@/components/admin/SkuStockHistory";
import {
  MAX_THRESHOLD,
  MIN_THRESHOLD,
  clampThreshold,
  parseStockFilters,
  toStockUrlParams,
  type StockFilters,
} from "@/lib/admin/stock-filters";
import type {
  AdminProductSummary,
  DashboardResponse,
  StockResponse,
} from "@/lib/types/admin";
import type { PaginatedResponse } from "@/lib/types/api";

const TYPING_DEBOUNCE_MS = 350;
const SEARCH_PAGE_SIZE = 10;
const AGE_TICK_MS = 15_000;

const SECTION_TITLE = "text-xs text-muted-foreground uppercase tracking-widest";

function describeAge(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return "agora mesmo";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.round(minutes / 60);
  return hours === 1 ? "há 1 hora" : `há ${hours} horas`;
}

export function StockContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const { q, threshold, page, open } = parseStockFilters(
    new URLSearchParams(searchParams.toString()),
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const write = (patch: Partial<StockFilters>) => {
    const query = toStockUrlParams({ q, threshold, page, open, ...patch }).toString();
    router.replace(query ? `/admin/stock?${query}` : "/admin/stock", { scroll: false });
  };

  const [draft, setDraft] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  if (syncedQ !== q) {
    setSyncedQ(q);
    setDraft(q);
  }

  const onSearchChange = (value: string) => {
    setDraft(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      write({ q: value.trim() });
    }, TYPING_DEBOUNCE_MS);
  };

  const commitSearchNow = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    write({ q: draft.trim() });
  };

  const search = useQuery({
    queryKey: ["admin", "products", "stock-search", q],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<PaginatedResponse<AdminProductSummary>>(
        "/v1/admin/products",
        { params: { searchTerm: q, size: SEARCH_PAGE_SIZE, sort: "name" }, signal },
      );
      return response.data;
    },
    enabled: q.length > 0,
    placeholderData: keepPreviousData,
  });

  const {
    data,
    isLoading,
    isError,
    isPlaceholderData,
    isFetching,
    dataUpdatedAt,
    refetch,
  } = useQuery({
    queryKey: ["admin", "dashboard", threshold, page],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<DashboardResponse>("/v1/admin/dashboard", {
        params: { lowStockThreshold: threshold, lowStockPage: page },
        signal,
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const [applied, setApplied] = useState<Record<number, { quantity: number; version: number }>>({});

  const [historyFor, setHistoryFor] = useState<number | null>(null);

  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), AGE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const [syncedUpdatedAt, setSyncedUpdatedAt] = useState(dataUpdatedAt);
  if (syncedUpdatedAt !== dataUpdatedAt) {
    setSyncedUpdatedAt(dataUpdatedAt);
    setNowTick(dataUpdatedAt);
    if (Object.keys(applied).length > 0) setApplied({});
  }

  const afterStockChange = () => {
    void queryClient.invalidateQueries({ queryKey: ["products"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
  };

  const onAlertApplied = (result: StockResponse) => {
    setApplied((current) => ({
      ...current,
      [result.skuId]: { quantity: result.stockQuantity, version: result.version },
    }));
    afterStockChange();
  };

  const reload = () => void refetch();

  const lowStock = data?.lowStock ?? [];
  const pageSize = data?.lowStockPageSize || 1;
  const lowStockPages = data ? Math.ceil(data.lowStockCount / pageSize) : 0;
  const rangeStart = data && lowStock.length > 0 ? data.lowStockPage * pageSize + 1 : 0;
  const rangeEnd = rangeStart > 0 ? rangeStart + lowStock.length - 1 : 0;

  const results = (search.data?.content ?? []).filter((product) => product.id !== open);

  const pinnedInResults = (search.data?.content.length ?? 0) - results.length;

  return (
    <div className="flex flex-col gap-12">
      <section>
        <h2 className={SECTION_TITLE}>Buscar produto</h2>

        <div className="mt-4 flex items-center gap-2 max-w-xl">
          <div className="flex-1 flex items-center border border-muted focus-within:border-foreground transition-colors">
            <Search className="w-4 h-4 ml-3 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
            <input
              type="search"
              value={draft}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitSearchNow();
                }
              }}
              placeholder="nome do produto"
              aria-label="Buscar produto por nome"
              className="flex-1 h-10 px-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
            {search.isFetching && (
              <Loader2 className="w-3.5 h-3.5 mr-3 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground max-w-xl leading-relaxed">
          Abra um produto para ver e ajustar o estoque de cada cor e tamanho, mesmo os que estão acima
          do limiar de alerta.
        </p>

        {open !== undefined && (
          <div className="mt-6">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Produto selecionado
              </h3>
              <button
                type="button"
                onClick={() => write({ open: undefined })}
                className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                Limpar
              </button>
            </div>

            <div className="mt-2 border-t border-muted">
              <ProductStockPanel
                key={open}
                productId={open}
                defaultOpen
                onApplied={afterStockChange}
              />
            </div>
          </div>
        )}

        {q.length > 0 && (
          <div className="mt-5">
            {search.isError ? (
              <p className="text-sm text-red-600">Falha ao buscar produtos.</p>
            ) : search.isLoading ? (
              <p className="text-sm text-muted-foreground">Buscando…</p>
            ) : results.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {pinnedInResults > 0
                  ? `O único produto com “${q}” no nome é o que está aberto acima.`
                  : `Nenhum produto com “${q}” no nome.`}
              </p>
            ) : (
              <div className={`transition-opacity ${search.isPlaceholderData ? "opacity-50" : ""}`}>
                <p className="text-xs text-muted-foreground">
                  {search.data && search.data.page.totalElements - pinnedInResults > results.length
                    ? `${results.length} de ${search.data.page.totalElements - pinnedInResults} produtos — refine o termo para ver o resto.`
                    : `${results.length} ${results.length === 1 ? "produto" : "produtos"}.`}
                </p>

                <div className="mt-2 border-t border-muted">
                  {results.map((product) => (
                    <ProductStockPanel
                      key={product.id}
                      productId={product.id}
                      summary={product}
                      onApplied={afterStockChange}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className={SECTION_TITLE}>Estoque baixo</h2>

          <div className="flex items-center gap-4">

            <span className="text-[11px] text-muted-foreground" aria-live="polite">
              {isFetching ? "Atualizando…" : `Lido ${describeAge(nowTick - dataUpdatedAt)}`}
            </span>
            <button
              type="button"
              onClick={reload}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-2 py-1 border border-muted text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} strokeWidth={1.5} />
              Atualizar
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          Alertar com até
          <ThresholdStepper
            threshold={threshold}
            onCommit={(value) => write({ threshold: value, page: 0 })}
          />
          unidades
        </div>

        <div className={`mt-4 transition-opacity ${isPlaceholderData ? "opacity-50" : ""}`}>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : isError || !data ? (
            <p className="text-sm tracking-widest uppercase text-muted-foreground">
              Falha ao carregar os alertas.
            </p>
          ) : lowStock.length === 0 && data.lowStockCount > 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                Esta página não tem alertas, mas existem {data.lowStockCount} SKUs abaixo do limiar.
              </p>
              <button
                type="button"
                onClick={() => write({ page: 0 })}
                className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                Ir para a primeira página
              </button>
            </div>
          ) : lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum SKU abaixo de {threshold} {threshold === 1 ? "unidade" : "unidades"}.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {rangeStart}–{rangeEnd} de {data.lowStockCount} SKUs, do menor estoque para o maior.
              </p>

              <div className="mt-4 hidden md:block overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-muted-foreground border-b border-muted">
                      <th className="py-2 pr-4 font-normal">Produto</th>
                      <th className="py-2 pr-4 font-normal">Cor</th>
                      <th className="py-2 pr-4 font-normal">Tam.</th>
                      <th className="py-2 pr-4 font-normal">SKU</th>
                      <th className="py-2 pr-4 font-normal">Estoque</th>
                      <th className="py-2 font-normal">Ajustar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map((sku) => {
                      const adjusted = applied[sku.skuId];
                      const current = adjusted?.quantity ?? sku.stockQuantity;
                      const version = adjusted?.version ?? sku.version;
                      const showHistory = historyFor === sku.skuId;
                      return (
                        <Fragment key={sku.skuId}>
                          <tr className="border-b border-muted/60 align-middle">
                            <td className="py-3 pr-4 text-foreground">{sku.productName}</td>
                            <td className="py-3 pr-4 text-muted-foreground">{sku.colorName}</td>
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
                                onToggle={() => setHistoryFor(showHistory ? null : sku.skuId)}
                              />
                            </td>
                            <td className="py-3">
                              <StockAdjustForm
                                skuId={sku.skuId}
                                stockQuantity={current}
                                version={version}
                                onApplied={onAlertApplied}
                                onStale={reload}
                              />
                            </td>
                          </tr>

                          {showHistory && (
                            <tr className="border-b border-muted/60">
                              <td colSpan={6} className="pb-4 pt-1">
                                <SkuStockHistory skuId={sku.skuId} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="mt-4 md:hidden flex flex-col gap-3">
                {lowStock.map((sku) => {
                  const adjusted = applied[sku.skuId];
                  const current = adjusted?.quantity ?? sku.stockQuantity;
                  const version = adjusted?.version ?? sku.version;
                  const showHistory = historyFor === sku.skuId;
                  return (
                    <li key={sku.skuId} className="border border-muted p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="block text-sm text-foreground">{sku.productName}</span>
                          <span className="block text-xs text-muted-foreground">
                            {sku.colorName} · {sku.size}
                          </span>
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
                            {current === 0 && <AlertTriangle className="w-4 h-4" strokeWidth={2} />}
                            {current}
                          </span>
                          {adjusted && (
                            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                              atualizado
                            </span>
                          )}
                          <SkuHistoryToggle
                            isOpen={showHistory}
                            onToggle={() => setHistoryFor(showHistory ? null : sku.skuId)}
                          />
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-muted/60">
                        <StockAdjustForm
                          skuId={sku.skuId}
                          stockQuantity={current}
                          version={version}
                          onApplied={onAlertApplied}
                          onStale={reload}
                        />
                      </div>

                      {showHistory && (
                        <div className="mt-3">
                          <SkuStockHistory skuId={sku.skuId} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {lowStockPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-6">
                  <button
                    type="button"
                    onClick={() => write({ page: page - 1 })}
                    disabled={page === 0}
                    className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Página anterior de estoque baixo"
                  >
                    <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    Página {page + 1} de {lowStockPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => write({ page: page + 1 })}
                    disabled={page + 1 >= lowStockPages}
                    className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Próxima página de estoque baixo"
                  >
                    <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function ThresholdStepper({
  threshold,
  onCommit,
}: {
  threshold: number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(threshold));
  const [synced, setSynced] = useState(threshold);
  if (synced !== threshold) {
    setSynced(threshold);
    setDraft(String(threshold));
  }

  const commit = (value: number) => {
    const clamped = clampThreshold(value);
    setDraft(String(clamped));
    if (clamped !== threshold) onCommit(clamped);
  };

  const commitDraft = () => {
    const parsed = Number(draft);
    if (draft.trim() === "" || !Number.isInteger(parsed)) {
      setDraft(String(threshold));
      return;
    }
    commit(parsed);
  };

  return (
    <div className="flex items-center border border-muted focus-within:border-foreground transition-colors">
      <button
        type="button"
        aria-label="Diminuir o limiar em uma unidade"
        onClick={() => commit(threshold - 1)}
        disabled={threshold <= MIN_THRESHOLD}
        className="w-8 h-8 text-base leading-none text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        −
      </button>

      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          if (next === "" || /^\d*$/.test(next)) setDraft(next);
        }}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitDraft();
            return;
          }
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            commit(threshold + (event.key === "ArrowUp" ? 1 : -1));
          }
        }}
        aria-label="Limiar de estoque baixo"
        className="w-12 h-8 bg-transparent text-sm text-center text-foreground focus:outline-none"
      />

      <button
        type="button"
        aria-label="Aumentar o limiar em uma unidade"
        onClick={() => commit(threshold + 1)}
        disabled={threshold >= MAX_THRESHOLD}
        className="w-8 h-8 text-base leading-none text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        +
      </button>
    </div>
  );
}
