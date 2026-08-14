"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { formatBRL, formatServerDateTime } from "@/lib/utils/format";
import { formatAdminError } from "@/lib/admin/errors";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { OrderStatusActions } from "@/components/admin/OrderStatusActions";
import type { AdminOrderResponse } from "@/lib/types/admin";

const CARD = "border border-muted p-5";
const CARD_TITLE = "text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3";

function formatPostalCode(value: string): string {
  return /^\d{8}$/.test(value) ? `${value.slice(0, 5)}-${value.slice(5)}` : value;
}

export function OrderDetailContent({ orderId: rawId }: { orderId: string }) {
  const parsed = Number(rawId);
  const orderId = Number.isInteger(parsed) && parsed > 0 ? parsed : null;

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["admin", "order", orderId],
    enabled: orderId !== null,
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<AdminOrderResponse>(`/v1/admin/orders/${orderId}`, {
        signal,
      });
      return response.data;
    },
  });

  if (isLoading && orderId !== null) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (orderId === null || error || !order) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-sm text-muted-foreground">
          {orderId === null
            ? `"${rawId}" não é um número de pedido válido.`
            : formatAdminError(error, "Não foi possível carregar este pedido.")}
        </p>
        <Link
          href="/admin/orders"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          Voltar para a listagem
        </Link>
      </div>
    );
  }

  const address = order.shippingAddress;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          Pedidos
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <h1 className="font-serif text-xl md:text-2xl tracking-wide text-foreground">
            Pedido #{order.id}
          </h1>
          <OrderStatusBadge status={order.status} />
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          Criado em {formatServerDateTime(order.createdAt)}
        </p>

        {order.status === "PENDING_PAYMENT" && order.expiresAt && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-amber-700">
            <Clock className="w-4 h-4" strokeWidth={1.5} />
            Prazo de pagamento até {formatServerDateTime(order.expiresAt)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className={CARD}>
          <h2 className={CARD_TITLE}>Cliente</h2>
          <p className="text-sm text-foreground">{order.customerName}</p>
          <p className="text-sm text-muted-foreground break-all">{order.customerEmail}</p>
          <p className="mt-2 text-xs text-muted-foreground/70 font-mono break-all">
            {order.customerId}
          </p>
        </section>

        <section className={CARD}>
          <h2 className={CARD_TITLE}>Entrega</h2>
          <address className="not-italic text-sm text-muted-foreground leading-relaxed">
            <span className="text-foreground">
              {address.street}, {address.number}
              {address.complement ? ` — ${address.complement}` : ""}
            </span>
            <br />
            {address.neighborhood}
            <br />
            {address.city} / {address.state}
            <br />
            CEP {formatPostalCode(address.postalCode)}
          </address>
        </section>
      </div>

      <section>
        <h2 className={CARD_TITLE}>
          {order.items.length} {order.items.length === 1 ? "item" : "itens"}
        </h2>

        <ul className="flex flex-col divide-y divide-muted border-y border-muted">
          {order.items.map((item) => {
            const hadDiscount = item.listPriceAtPurchase > item.priceAtPurchase;
            return (
              <li key={item.id} className="py-4 flex gap-4">
                <div className="relative w-16 h-20 flex-shrink-0 bg-muted overflow-hidden">
                  {item.imageUrl && (
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      sizes="64px"
                      className="object-cover object-center"
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{item.productName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.color} · {item.size} · <span className="font-mono">{item.skuCode}</span>
                  </p>
                  {item.skuId === null && (
                    <p className="text-xs text-muted-foreground/70 mt-1 italic">
                      SKU não está mais no catálogo
                    </p>
                  )}
                </div>

                <div className="text-right whitespace-nowrap">
                  <p className="text-sm text-foreground">{formatBRL(item.priceAtPurchase)}</p>
                  {hadDiscount && (
                    <p className="text-xs text-muted-foreground line-through">
                      {formatBRL(item.listPriceAtPurchase)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">× {item.quantity}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          <p className="text-muted-foreground">Frete {formatBRL(order.shippingFee)}</p>
          <p className="text-foreground font-medium text-base">
            Total {formatBRL(order.totalAmount)}
          </p>
        </div>
      </section>

      <section className={CARD}>
        <h2 className={CARD_TITLE}>Mudar status</h2>
        <OrderStatusActions orderId={order.id} currentStatus={order.status} />
      </section>
    </div>
  );
}
