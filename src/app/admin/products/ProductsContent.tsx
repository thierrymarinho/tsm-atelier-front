"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  History,
  Loader2,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { revalidateProducts } from "@/lib/api/revalidate";
import { useToast } from "@/lib/context/ToastContext";
import { formatAdminError } from "@/lib/admin/errors";
import { formatBRL } from "@/lib/utils/format";
import { translateCategory, translateTargetAudience } from "@/lib/utils/translations";
import {
  PRODUCT_SORT_OPTIONS,
  activeProductFilterCount,
  parseProductFilters,
  toProductApiParams,
  toProductUrlParams,
  type ProductFilters,
} from "@/lib/admin/product-filters";
import { stockHref } from "@/lib/admin/stock-filters";
import type { AdminCollectionResponse, AdminProductSummary } from "@/lib/types/admin";
import {
  CATEGORIES,
  TARGET_AUDIENCES,
  type Category,
  type PaginatedResponse,
  type TargetAudience,
} from "@/lib/types/api";

const TYPING_DEBOUNCE_MS = 350;

const FIELD =
  "h-9 px-3 bg-transparent border border-muted text-sm text-foreground focus:outline-none focus:border-foreground transition-colors";

const LABEL = "text-[10px] uppercase tracking-[0.15em] text-muted-foreground";

const THUMB = 48;

export function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filters = useMemo(
    () => parseProductFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const write = (next: ProductFilters) => {
    const query = toProductUrlParams(next).toString();
    router.replace(query ? `/admin/products?${query}` : "/admin/products", { scroll: false });
  };

  const applyPatch = (patch: Partial<ProductFilters>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    write({ ...filters, ...patch, page: 0 });
  };

  const goToPage = (page: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    write({ ...filters, page });
  };

  const [qDraft, setQDraft] = useState(filters.q ?? "");
  const [minDraft, setMinDraft] = useState(filters.minPrice?.toString() ?? "");
  const [maxDraft, setMaxDraft] = useState(filters.maxPrice?.toString() ?? "");
  const textKey = `${filters.q ?? ""}|${filters.minPrice ?? ""}|${filters.maxPrice ?? ""}`;
  const [syncedText, setSyncedText] = useState(textKey);
  if (syncedText !== textKey) {
    setSyncedText(textKey);
    setQDraft(filters.q ?? "");
    setMinDraft(filters.minPrice?.toString() ?? "");
    setMaxDraft(filters.maxPrice?.toString() ?? "");
  }

  const debounced = (patch: Partial<ProductFilters>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => write({ ...filters, ...patch, page: 0 }), TYPING_DEBOUNCE_MS);
  };

  const { data: categories } = useQuery({
    queryKey: ["catalog", "categories", filters.targetAudience],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<Category[]>("/v1/catalog/products/categories", {
        params: { targetAudience: filters.targetAudience },
        signal,
      });
      return response.data;
    },
    enabled: filters.targetAudience !== undefined,
    staleTime: 10 * 60 * 1000,
  });

  const categoryOptions = filters.targetAudience ? (categories ?? []) : CATEGORIES;

  const { data: collections } = useQuery({
    queryKey: ["admin", "collections"],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<AdminCollectionResponse[]>("/v1/admin/collections", {
        signal,
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isError, isPlaceholderData } = useQuery({
    queryKey: ["admin", "products", "list", filters],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<PaginatedResponse<AdminProductSummary>>(
        "/v1/admin/products",
        { params: toProductApiParams(filters), signal },
      );
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const products = data?.content ?? [];
  const totalPages = data?.page.totalPages ?? 0;
  const totalElements = data?.page.totalElements ?? 0;
  const currentPage = data?.page.number ?? 0;
  const activeCount = activeProductFilterCount(filters);

  const clearAll = () => write({ sort: filters.sort, page: 0 });

  const restore = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.post(`/v1/admin/products/${id}/restore`);
      return id;
    },
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "product", id] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
      void revalidateProducts();
      toast("Produto restaurado, mas ainda fora do ar. Publique pelo formulário.", "info");
    },
    onError: (error) => {
      toast(formatAdminError(error, "Não foi possível restaurar o produto."), "error");
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1.5 min-w-0 xl:col-span-2">
            <span className={LABEL}>Buscar</span>
            <div className="flex items-center border border-muted focus-within:border-foreground transition-colors">
              <Search className="w-4 h-4 ml-3 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
              <input
                type="search"
                value={qDraft}
                onChange={(event) => {
                  setQDraft(event.target.value);
                  debounced({ q: event.target.value.trim() || undefined });
                }}
                placeholder="nome ou descrição"
                className="flex-1 h-9 px-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5 min-w-0">
            <span className={LABEL}>Público</span>
            <select
              value={filters.targetAudience ?? ""}
              onChange={(event) =>
                applyPatch({
                  targetAudience: (event.target.value || undefined) as TargetAudience | undefined,
                  category: undefined,
                })
              }
              className={`${FIELD} cursor-pointer`}
            >
              <option value="">Todos</option>
              {TARGET_AUDIENCES.map((audience) => (
                <option key={audience} value={audience}>
                  {translateTargetAudience(audience)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 min-w-0">
            <span className={LABEL}>Categoria</span>
            <select
              value={filters.category ?? ""}
              onChange={(event) =>
                applyPatch({ category: (event.target.value || undefined) as Category | undefined })
              }
              className={`${FIELD} cursor-pointer`}
            >
              <option value="">Todas</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {translateCategory(category)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          <label className="flex flex-col gap-1.5 min-w-0 col-span-2 sm:col-span-1">
            <span className={LABEL}>Coleção</span>
            <select
              value={filters.collectionId ?? ""}
              onChange={(event) =>
                applyPatch({ collectionId: event.target.value ? Number(event.target.value) : undefined })
              }
              className={`${FIELD} cursor-pointer`}
            >
              <option value="">Todas</option>
              {(collections ?? []).map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                  {collection.active ? "" : " (inativa)"}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 min-w-0">
            <span className={LABEL}>Preço de</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={minDraft}
              onChange={(event) => {
                setMinDraft(event.target.value);
                debounced({ minPrice: event.target.value ? Number(event.target.value) : undefined });
              }}
              placeholder="0"
              className={FIELD}
            />
          </label>

          <label className="flex flex-col gap-1.5 min-w-0">
            <span className={LABEL}>até</span>
            <input
              type="number"
              inputMode="decimal"
              min={filters.minPrice ?? 0}
              step="0.01"
              value={maxDraft}
              onChange={(event) => {
                setMaxDraft(event.target.value);
                debounced({ maxPrice: event.target.value ? Number(event.target.value) : undefined });
              }}
              placeholder="∞"
              className={FIELD}
            />
          </label>

          <label className="flex flex-col gap-1.5 min-w-0">
            <span className={LABEL}>Destaque</span>
            <select
              value={filters.isFeatured === undefined ? "" : String(filters.isFeatured)}
              onChange={(event) =>
                applyPatch({ isFeatured: event.target.value === "" ? undefined : event.target.value === "true" })
              }
              className={`${FIELD} cursor-pointer`}
            >
              <option value="">Todos</option>
              <option value="true">Em destaque</option>
              <option value="false">Sem destaque</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 min-w-0">
            <span className={LABEL}>Promoção</span>
            <select
              value={filters.onSale === undefined ? "" : String(filters.onSale)}
              onChange={(event) =>
                applyPatch({ onSale: event.target.value === "" ? undefined : event.target.value === "true" })
              }
              className={`${FIELD} cursor-pointer`}
            >
              <option value="">Todos</option>
              <option value="true">Em promoção</option>
              <option value="false">Preço cheio</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 min-w-0">
            <span className={LABEL}>Ordenar por</span>
            <select
              value={filters.sort}
              onChange={(event) => applyPatch({ sort: event.target.value })}
              className={`${FIELD} cursor-pointer`}
            >
              {PRODUCT_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center justify-between gap-4 min-h-6">
          <p className="text-xs text-muted-foreground">
            {isLoading
              ? "Carregando…"
              : `${totalElements} ${totalElements === 1 ? "produto" : "produtos"}`}
          </p>
          <div className="flex items-center gap-4">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                Limpar filtros ({activeCount})
              </button>
            )}
            <Link
              href="/admin/products/new"
              className="flex items-center gap-1.5 px-3 h-9 bg-foreground text-background text-[10px] font-semibold tracking-[0.15em] uppercase hover:bg-foreground/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              Novo produto
            </Link>
          </div>
        </div>

        {filters.sort.startsWith("price") && (
          <p className="text-[11px] text-muted-foreground -mt-1">
            A ordenação usa o preço de tabela; um produto em promoção continua no lugar do preço
            cheio. A faixa de preço acima usa o preço efetivo.
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <p className="text-sm tracking-widest uppercase text-muted-foreground">
          Falha ao carregar os produtos.
        </p>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm tracking-widest uppercase text-muted-foreground">
            Nenhum produto encontrado.
          </p>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className={`transition-opacity ${isPlaceholderData ? "opacity-50" : ""}`}>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-muted-foreground border-b border-muted">
                  <th className="py-2 pr-4 font-normal" scope="col">
                    <span className="sr-only">Capa</span>
                  </th>
                  <th className="py-2 pr-4 font-normal" scope="col">Produto</th>
                  <th className="py-2 pr-4 font-normal" scope="col">Cores</th>
                  <th className="py-2 pr-4 font-normal" scope="col">Preço</th>
                  <th className="py-2 pr-4 font-normal" scope="col">Situação</th>
                  <th className="py-2 font-normal" scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onRestore={() => restore.mutate(product.id)}
                    isRestoring={restore.isPending && restore.variables === product.id}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden flex flex-col gap-3">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard
                  product={product}
                  onRestore={() => restore.mutate(product.id)}
                  isRestoring={restore.isPending && restore.variables === product.id}
                />
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Página anterior"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Página {currentPage + 1} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage + 1 >= totalPages}
                className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Próxima página"
              >
                <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProductRow({
  product,
  onRestore,
  isRestoring,
}: {
  product: AdminProductSummary;
  onRestore: () => void;
  isRestoring: boolean;
}) {
  const isGone = product.deletedAt !== null;
  const onSale = product.promotionalPrice !== null;

  return (
    <tr className="border-b border-muted/60 align-middle hover:bg-muted/20 transition-colors">
      <td className="py-3 pr-4">
        <div
          className={`relative bg-muted/40 overflow-hidden flex-shrink-0 ${isGone ? "opacity-40" : ""}`}
          style={{ width: THUMB, height: THUMB }}
        >
          {product.coverImageUrl ? (
            <Image
              src={product.coverImageUrl}
              alt=""
              width={THUMB}
              height={THUMB}
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Package className="w-4 h-4" strokeWidth={1.5} />
            </span>
          )}
        </div>
      </td>

      <td className="py-3 pr-4 min-w-0">
        <span className={`block ${isGone ? "text-muted-foreground line-through" : "text-foreground"}`}>
          {product.name}
        </span>
        <span className="block text-xs text-muted-foreground font-mono truncate">{product.slug}</span>
      </td>

      <td className="py-3 pr-4">
        <span className="flex items-center gap-1">
          {product.colorsHex.map((hex, index) => (
            <span
              key={`${hex}-${index}`}
              title={hex}
              className="w-3 h-3 rounded-full border border-muted flex-shrink-0"
              style={{ backgroundColor: hex }}
            />
          ))}
        </span>
      </td>

      <td className="py-3 pr-4 whitespace-nowrap">
        {onSale ? (
          <>
            <span className="text-foreground font-medium">
              {formatBRL(product.promotionalPrice as number)}
            </span>
            <span className="block text-xs text-muted-foreground line-through">
              {formatBRL(product.price)}
            </span>
          </>
        ) : (
          <span className="text-foreground">{formatBRL(product.price)}</span>
        )}
      </td>

      <td className="py-3 pr-4 whitespace-nowrap">
        <ProductStatus product={product} />
      </td>

      <td className="py-3">
        <ProductActions product={product} onRestore={onRestore} isRestoring={isRestoring} />
      </td>
    </tr>
  );
}

function ProductCard({
  product,
  onRestore,
  isRestoring,
}: {
  product: AdminProductSummary;
  onRestore: () => void;
  isRestoring: boolean;
}) {
  const isGone = product.deletedAt !== null;
  const onSale = product.promotionalPrice !== null;

  return (
    <div className="border border-muted">
      <div className="flex gap-3 p-3">
        <div
          className={`relative bg-muted/40 overflow-hidden flex-shrink-0 ${isGone ? "opacity-40" : ""}`}
          style={{ width: THUMB, height: THUMB }}
        >
          {product.coverImageUrl ? (
            <Image
              src={product.coverImageUrl}
              alt=""
              width={THUMB}
              height={THUMB}
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Package className="w-4 h-4" strokeWidth={1.5} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span
              className={`text-sm ${isGone ? "text-muted-foreground line-through" : "text-foreground"}`}
            >
              {product.name}
            </span>
            <ProductStatus product={product} />
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1">
              {product.colorsHex.map((hex, index) => (
                <span
                  key={`${hex}-${index}`}
                  title={hex}
                  className="w-3 h-3 rounded-full border border-muted flex-shrink-0"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </span>

            <span className="text-sm whitespace-nowrap">
              {onSale ? (
                <>
                  <span className="text-muted-foreground line-through text-xs mr-1.5">
                    {formatBRL(product.price)}
                  </span>
                  <span className="text-foreground font-medium">
                    {formatBRL(product.promotionalPrice as number)}
                  </span>
                </>
              ) : (
                <span className="text-foreground">{formatBRL(product.price)}</span>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-muted px-3 py-2">
        <ProductActions product={product} onRestore={onRestore} isRestoring={isRestoring} />
      </div>
    </div>
  );
}

function ProductStatus({ product }: { product: AdminProductSummary }) {
  const isGone = product.deletedAt !== null;

  return (
    <span className="flex-shrink-0 text-right">
      {isGone ? (
        <span className="text-[10px] uppercase tracking-widest text-red-600">Removido</span>
      ) : !product.active ? (
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Fora do ar
        </span>
      ) : (
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">No ar</span>
      )}
      {product.featured && !isGone && (
        <span className="block text-[10px] uppercase tracking-widest text-foreground">Destaque</span>
      )}
    </span>
  );
}

function ProductActions({
  product,
  onRestore,
  isRestoring,
}: {
  product: AdminProductSummary;
  onRestore: () => void;
  isRestoring: boolean;
}) {
  const isGone = product.deletedAt !== null;
  const ACTION =
    "flex items-center gap-1 py-1 text-[10px] uppercase tracking-widest transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {isGone ? (
        <button
          type="button"
          onClick={onRestore}
          disabled={isRestoring}
          className={`${ACTION} text-foreground hover:underline disabled:opacity-40`}
        >
          {isRestoring ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
          )}
          Restaurar
        </button>
      ) : (
        <Link href={`/admin/products/${product.id}`} className={`${ACTION} text-foreground hover:underline`}>
          <Pencil className="w-3 h-3" strokeWidth={1.5} />
          Editar
        </Link>
      )}

      <Link href={stockHref(product)} className={`${ACTION} text-muted-foreground hover:text-foreground`}>
        <Package className="w-3 h-3" strokeWidth={1.5} />
        Estoque
      </Link>

      <Link
        href={`/admin/audit?entityType=PRODUCT&entityId=${product.id}`}
        className={`${ACTION} text-muted-foreground hover:text-foreground`}
      >
        <History className="w-3 h-3" strokeWidth={1.5} />
        Histórico
      </Link>

      {!isGone && product.active && (
        <Link
          href={`/product/${product.slug}`}
          target="_blank"
          className={`${ACTION} text-muted-foreground hover:text-foreground`}
        >
          <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
          Ver na loja
        </Link>
      )}
    </div>
  );
}
