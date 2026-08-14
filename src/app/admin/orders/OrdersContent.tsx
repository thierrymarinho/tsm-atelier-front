"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { formatBRL, formatServerDate } from "@/lib/utils/format";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { translateOrderStatus } from "@/lib/admin/order-status";
import {
  ORDER_SORT_OPTIONS,
  activeOrderFilterCount,
  parseOrderFilters,
  toApiParams,
  toUrlSearchParams,
  type OrderFilters,
} from "@/lib/admin/order-filters";
import { ORDER_STATUSES, type AdminOrderResponse, type OrderStatus } from "@/lib/types/admin";
import type { PaginatedResponse } from "@/lib/types/api";

const TYPING_DEBOUNCE_MS = 350;

const FIELD =
  "h-9 px-3 bg-transparent border border-muted text-sm text-foreground focus:outline-none focus:border-foreground transition-colors";

export function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseOrderFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const write = (next: OrderFilters) => {
    const query = toUrlSearchParams(next).toString();
    router.replace(query ? `/admin/orders?${query}` : "/admin/orders", { scroll: false });
  };

  const applyPatch = (patch: Partial<OrderFilters>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    write({ ...filters, ...patch, page: 0 });
  };

  const goToPage = (page: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    write({ ...filters, page });
  };

  const [draft, setDraft] = useState(filters.q ?? "");
  const [syncedQ, setSyncedQ] = useState(filters.q);
  if (syncedQ !== filters.q) {
    setSyncedQ(filters.q);
    setDraft(filters.q ?? "");
  }

  const onSearchChange = (value: string) => {
    setDraft(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      write({ ...filters, q: value.trim() || undefined, page: 0 });
    }, TYPING_DEBOUNCE_MS);
  };

  const { data, isLoading, isError, isPlaceholderData } = useQuery({
    queryKey: ["admin", "orders", filters],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<PaginatedResponse<AdminOrderResponse>>(
        "/v1/admin/orders",
        { params: toApiParams(filters), signal },
      );
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const orders = data?.content ?? [];
  const totalPages = data?.page.totalPages ?? 0;
  const totalElements = data?.page.totalElements ?? 0;
  const currentPage = data?.page.number ?? 0;
  const activeCount = activeOrderFilterCount(filters);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <label className="flex-1 flex flex-col gap-1.5 min-w-0">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Buscar
            </span>
            <div className="flex items-center gap-2 border border-muted focus-within:border-foreground transition-colors h-9 px-3">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
              <input
                type="text"
                value={draft}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="nº do pedido, e-mail ou nome"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Status
            </span>
            <select
              value={filters.status ?? ""}
              onChange={(event) =>
                applyPatch({
                  status: event.target.value ? (event.target.value as OrderStatus) : undefined,
                })
              }
              className={`${FIELD} cursor-pointer`}
            >
              <option value="">Todos</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {translateOrderStatus(status)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">De</span>
            <input
              type="date"
              value={filters.createdFrom ?? ""}
              max={filters.createdTo || undefined}
              onChange={(event) => applyPatch({ createdFrom: event.target.value || undefined })}
              className={FIELD}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Até</span>
            <input
              type="date"
              value={filters.createdTo ?? ""}
              min={filters.createdFrom || undefined}
              onChange={(event) => applyPatch({ createdTo: event.target.value || undefined })}
              className={FIELD}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Ordenar
            </span>
            <select
              value={filters.sort}
              onChange={(event) => applyPatch({ sort: event.target.value })}
              className={`${FIELD} cursor-pointer`}
            >
              {ORDER_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center justify-between gap-4 min-h-6">
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Carregando…" : `${totalElements} ${totalElements === 1 ? "pedido" : "pedidos"}`}
          </p>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() =>
                write({ status: undefined, q: undefined, createdFrom: undefined, createdTo: undefined, sort: filters.sort, page: 0 })
              }
              className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpar filtros ({activeCount})
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <p className="text-sm tracking-widest uppercase text-muted-foreground">
          Falha ao carregar os pedidos.
        </p>
      ) : orders.length === 0 ? (
        <p className="text-sm tracking-widest uppercase text-muted-foreground">
          Nenhum pedido encontrado.
        </p>
      ) : (
        <div className={`transition-opacity ${isPlaceholderData ? "opacity-50" : ""}`}>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-muted-foreground border-b border-muted">
                  <th className="py-2 pr-4 font-normal">Nº</th>
                  <th className="py-2 pr-4 font-normal">Data</th>
                  <th className="py-2 pr-4 font-normal">Cliente</th>
                  <th className="py-2 pr-4 font-normal">Status</th>
                  <th className="py-2 font-normal text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-muted/60 hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        #{order.id}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                      {formatServerDate(order.createdAt)}
                    </td>
                    <td className="py-3 pr-4 min-w-0">
                      <span className="block text-foreground truncate">{order.customerName}</span>
                      <span className="block text-xs text-muted-foreground truncate">
                        {order.customerEmail}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-3 text-right text-foreground whitespace-nowrap">
                      {formatBRL(order.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden flex flex-col gap-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="block border border-muted p-4 hover:border-foreground transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-foreground">#{order.id}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="mt-2 text-sm text-foreground truncate">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground truncate">{order.customerEmail}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{formatServerDate(order.createdAt)}</span>
                    <span className="text-foreground font-medium">{formatBRL(order.totalAmount)}</span>
                  </div>
                </Link>
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
