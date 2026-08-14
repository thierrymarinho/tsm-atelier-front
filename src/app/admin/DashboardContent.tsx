"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Loader2, RotateCw } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { formatBRL } from "@/lib/utils/format";
import { translateOrderStatus } from "@/lib/admin/order-status";
import { DEFAULT_THRESHOLD } from "@/lib/admin/stock-filters";
import type { DashboardResponse, OrderStatus } from "@/lib/types/admin";

const PREVIEW_ROWS = 5;

const STATUS_ORDER: { status: OrderStatus; actionable?: boolean }[] = [
  { status: "PENDING_PAYMENT", actionable: true },
  { status: "PAID", actionable: true },
  { status: "SHIPPED" },
  { status: "DELIVERED" },
  { status: "PAYMENT_FAILED" },
  { status: "CANCELLED" },
];

const AGE_TICK_MS = 15_000;

function describeAge(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return "agora mesmo";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.round(minutes / 60);
  return hours === 1 ? "há 1 hora" : `há ${hours} horas`;
}

const SECTION_TITLE = "text-xs text-muted-foreground uppercase tracking-widest";

export function DashboardContent() {
  const { data, isLoading, isError, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["admin", "dashboard", DEFAULT_THRESHOLD, 0],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<DashboardResponse>("/v1/admin/dashboard", {
        params: { lowStockThreshold: DEFAULT_THRESHOLD, lowStockPage: 0 },
        signal,
      });
      return response.data;
    },
    refetchOnWindowFocus: false,
  });

  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), AGE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const [syncedUpdatedAt, setSyncedUpdatedAt] = useState(dataUpdatedAt);
  if (syncedUpdatedAt !== dataUpdatedAt) {
    setSyncedUpdatedAt(dataUpdatedAt);
    setNowTick(dataUpdatedAt);
  }

  const totalOrders = useMemo(
    () =>
      data ? STATUS_ORDER.reduce((sum, { status }) => sum + (data.ordersByStatus[status] ?? 0), 0) : 0,
    [data],
  );

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-sm tracking-widest uppercase text-muted-foreground">
        Falha ao carregar o painel.
      </p>
    );
  }

  const preview = data.lowStock.slice(0, PREVIEW_ROWS);

  return (
    <div className="flex flex-col gap-6">

      <div className="flex items-center justify-end gap-3 text-[11px] text-muted-foreground">
        <span aria-live="polite">
          {isFetching ? "Atualizando…" : `Números lidos ${describeAge(nowTick - dataUpdatedAt)}`}
        </span>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-2 py-1 border border-muted uppercase tracking-widest hover:text-foreground hover:border-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} strokeWidth={1.5} />
          Atualizar
        </button>
      </div>

      <div className="flex flex-col gap-12">
        <section>
          <h2 className={SECTION_TITLE}>Faturamento reconhecido</h2>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(
              [
                { label: "Hoje", value: data.revenue.today },
                { label: "Últimos 7 dias", value: data.revenue.last7Days },
                { label: "Últimos 30 dias", value: data.revenue.last30Days },
              ] as const
            ).map(({ label, value }) => (
              <div key={label} className="border border-muted p-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                <p className="mt-2 font-serif text-2xl text-foreground">{formatBRL(value)}</p>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed max-w-2xl">
            Soma dos pedidos pagos, enviados e entregues, em dias inteiros a partir da meia-noite. É
            valor de pedido, não dinheiro liquidado: um pedido pago que for cancelado sai desta conta
            sem que o estorno tenha acontecido na Stripe.
          </p>
        </section>

        <section>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className={SECTION_TITLE}>Pedidos por status</h2>
            <span className="text-xs text-muted-foreground">{totalOrders} no total</span>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {STATUS_ORDER.map(({ status, actionable }) => (
              <Link
                key={status}
                href={`/admin/orders?status=${status}`}
                className={`border p-4 transition-colors hover:border-foreground ${
                  actionable ? "border-foreground/40 bg-muted/30" : "border-muted"
                }`}
              >
                <p className="font-serif text-2xl text-foreground">{data.ordersByStatus[status]}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground leading-tight">
                  {translateOrderStatus(status)}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className={SECTION_TITLE}>Estoque baixo</h2>
            <Link
              href="/admin/stock"
              className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Ir para o estoque
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </Link>
          </div>

          {preview.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhum SKU abaixo de {DEFAULT_THRESHOLD} unidades.
            </p>
          ) : (
            <>
              <p className="mt-2 text-xs text-muted-foreground">
                {data.lowStockCount} {data.lowStockCount === 1 ? "SKU" : "SKUs"} abaixo de{" "}
                {DEFAULT_THRESHOLD} unidades
                {data.lowStockCount > preview.length
                  ? `; os ${preview.length} mais críticos:`
                  : ":"}
              </p>

              <ul className="mt-4 border-t border-muted">
                {preview.map((sku) => (
                  <li
                    key={sku.skuId}
                    className="flex items-baseline justify-between gap-4 py-3 border-b border-muted/60"
                  >
                    <span className="text-sm text-foreground truncate">
                      {sku.productName}
                      <span className="text-muted-foreground">
                        {" · "}
                        {sku.colorName}
                        {" · "}
                        {sku.size}
                      </span>
                    </span>

                    <span
                      className={`flex items-center gap-1.5 text-sm font-medium flex-shrink-0 ${
                        sku.stockQuantity === 0 ? "text-red-600" : "text-foreground"
                      }`}
                    >
                      {sku.stockQuantity === 0 && (
                        <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
                      )}
                      {sku.stockQuantity}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
