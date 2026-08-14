"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, SlidersHorizontal, X } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { ProductCard } from "@/components/domain/ProductCard";
import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";
import { SearchFilters } from "@/components/search/SearchFilters";
import type { PaginatedResponse, ProductSummaryDTO, Category } from "@/lib/types/api";
import { formatBRL } from "@/lib/utils/format";
import { translateCategory, translateTargetAudience } from "@/lib/utils/translations";
import {
  SEARCH_PAGE_SIZE,
  SORT_OPTIONS,
  activeFilterCount,
  emptyFilters,
  hasAnyFilter,
  parseSearchFilters,
  toApiParams,
  toUrlSearchParams,
  type SearchFilters as Filters,
} from "@/lib/search/filters";

const TYPING_DEBOUNCE_MS = 350;

interface Chip {
  label: string;
  patch: Partial<Filters>;
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-2 border border-muted px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
    >
      <span>{label}</span>
      <X className="w-3 h-3" strokeWidth={2} />
      <span className="sr-only">Remover filtro</span>
    </button>
  );
}

export function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseSearchFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const pushFilters = useCallback(
    (next: Filters) => {
      const query = toUrlSearchParams(next).toString();
      router.replace(query ? `/search?${query}` : "/search", { scroll: false });
    },
    [router],
  );

  const clearPendingWrite = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  useEffect(() => clearPendingWrite, [clearPendingWrite]);

  const applyPatch = useCallback(
    (patch: Partial<Filters>) => {
      clearPendingWrite();
      pushFilters({ ...filters, ...patch });
    },
    [clearPendingWrite, filters, pushFilters],
  );

  const applyTerm = useCallback(
    (term: string) => {
      clearPendingWrite();
      debounceRef.current = setTimeout(() => {
        pushFilters({ ...filters, q: term || undefined });
      }, TYPING_DEBOUNCE_MS);
    },
    [clearPendingWrite, filters, pushFilters],
  );

  const selectCategory = useCallback(
    (category: Category) => applyPatch({ category, q: undefined }),
    [applyPatch],
  );

  const clearAll = useCallback(() => {
    clearPendingWrite();
    pushFilters(emptyFilters());
  }, [clearPendingWrite, pushFilters]);

  const {
    data,
    isLoading,
    isError,
    isPlaceholderData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["products", "search", filters],
    queryFn: async ({ pageParam, signal }) => {
      const response = await apiClient.get<PaginatedResponse<ProductSummaryDTO>>(
        "/v1/catalog/products",
        { params: toApiParams(filters, pageParam, SEARCH_PAGE_SIZE), signal },
      );
      return response.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.page.number + 1 < lastPage.page.totalPages ? lastPage.page.number + 1 : undefined,
    placeholderData: keepPreviousData,
  });

  const products = useMemo(
    () => data?.pages.flatMap((page) => page.content) ?? [],
    [data],
  );
  const totalElements = data?.pages[0]?.page.totalElements ?? 0;
  const filterCount = activeFilterCount(filters);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDrawerOpen(false);
        drawerTriggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isDrawerOpen]);

  const chips = useMemo(() => {
    const items: Chip[] = [];

    if (filters.q) {
      items.push({ label: `"${filters.q}"`, patch: { q: undefined } });
    }
    if (filters.targetAudience) {
      items.push({
        label: translateTargetAudience(filters.targetAudience),
        patch: { targetAudience: undefined },
      });
    }
    if (filters.category) {
      items.push({
        label: translateCategory(filters.category),
        patch: { category: undefined },
      });
    }
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const from = filters.minPrice !== undefined ? formatBRL(filters.minPrice) : null;
      const to = filters.maxPrice !== undefined ? formatBRL(filters.maxPrice) : null;
      const label = from && to ? `${from} — ${to}` : from ? `A partir de ${from}` : `Até ${to}`;
      items.push({ label, patch: { minPrice: undefined, maxPrice: undefined } });
    }
    if (filters.onSale) {
      items.push({ label: "Promoções", patch: { onSale: undefined } });
    }
    if (filters.collectionId !== undefined) {
      items.push({ label: "Coleção", patch: { collectionId: undefined } });
    }

    return items;
  }, [filters]);

  const panel = (
    <SearchFilters filters={filters} onChange={applyPatch} onClearAll={clearAll} />
  );

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    drawerTriggerRef.current?.focus();
  };

  const drawer = (
    <div className="lg:hidden">
      <div
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${
          isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeDrawer}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
        className={`fixed top-0 left-0 h-dvh w-full max-w-[340px] bg-background z-[70] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-muted flex-shrink-0">
          <h2 className="text-sm font-semibold tracking-wider uppercase text-foreground">Filtros</h2>
          <button
            type="button"
            onClick={closeDrawer}
            className="p-1 hover:opacity-70 transition-opacity"
            aria-label="Fechar filtros"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-8">{panel}</div>

        <div className="px-6 py-4 border-t border-muted flex-shrink-0">
          <button
            type="button"
            onClick={closeDrawer}
            className="w-full border border-foreground py-3 text-xs uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background transition-colors"
          >
            Ver {totalElements} {totalElements === 1 ? "produto" : "produtos"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-10 xl:gap-14">
      <aside
        className="hidden lg:block lg:sticky lg:self-start lg:top-[calc(var(--header-height)+1.5rem)]
                   lg:max-h-[calc(100dvh-var(--header-height)-3rem)] lg:overflow-y-auto lg:overscroll-contain
                   lg:pr-3 scrollbar-slim"
      >
        {panel}
      </aside>

      <div className="min-w-0">
        <div className="mb-6">
          <SearchAutocomplete
            value={filters.q ?? ""}
            targetAudience={filters.targetAudience}
            onSubmitTerm={applyTerm}
            onSelectCategory={selectCategory}
          />
        </div>

        <div className="flex items-center justify-between gap-4 mb-4">
          <button
            ref={drawerTriggerRef}
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-expanded={isDrawerOpen}
            className="lg:hidden inline-flex items-center gap-2 border border-muted px-3 py-2 text-xs uppercase tracking-widest text-foreground hover:border-foreground transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
            Filtros
            {filterCount > 0 && <span aria-hidden="true">({filterCount})</span>}
            {filterCount > 0 && <span className="sr-only">{filterCount} filtros ativos</span>}
          </button>

          <p aria-live="polite" className="hidden lg:block text-xs uppercase tracking-widest text-muted-foreground">
            {isLoading ? " " : `${totalElements} ${totalElements === 1 ? "produto" : "produtos"}`}
          </p>

          <label className="flex items-center gap-2 ml-auto lg:ml-0">
            <span className="sr-only">Ordenar por</span>
            <select
              value={filters.sort}
              onChange={(event) => applyPatch({ sort: event.target.value })}
              className="bg-transparent border-b border-muted py-1.5 text-xs uppercase tracking-widest text-foreground focus:outline-none focus:border-foreground transition-colors cursor-pointer"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-8">
            {chips.map((chip) => (
              <FilterChip
                key={chip.label}
                label={chip.label}
                onRemove={() => applyPatch(chip.patch)}
              />
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors ml-1"
            >
              Limpar tudo
            </button>
          </div>
        )}

        <p className="lg:hidden text-xs uppercase tracking-widest text-muted-foreground mb-6">
          {isLoading ? " " : `${totalElements} ${totalElements === 1 ? "produto" : "produtos"}`}
        </p>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="tracking-widest uppercase text-sm">Carregando produtos...</p>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
            <p className="tracking-widest uppercase text-sm">Falha ao carregar os resultados.</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-5 text-center">
            <p className="tracking-widest uppercase text-sm text-muted-foreground">
              Nenhum produto encontrado.
            </p>
            {hasAnyFilter(filters) && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs uppercase tracking-widest border-b border-foreground pb-0.5 text-foreground hover:opacity-70 transition-opacity"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div
              className={`grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-14 transition-opacity duration-200 ${
                isPlaceholderData ? "opacity-50" : "opacity-100"
              }`}
            >
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {hasNextPage && (
              <div className="flex justify-center mt-14">
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="inline-flex items-center gap-3 border border-foreground px-10 py-3 text-xs uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground"
                >
                  {isFetchingNextPage && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isFetchingNextPage ? "Carregando" : "Carregar mais"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {isMounted && createPortal(drawer, document.body)}
    </div>
  );
}
