"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useToast } from "@/lib/context/ToastContext";
import { formatAdminError } from "@/lib/admin/errors";
import {
  ORDER_STATUS_TRANSITIONS,
  isRefundWarningRequired,
  orderStatusActionLabel,
  requiresConfirmation,
  translateOrderStatus,
} from "@/lib/admin/order-status";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import type { AdminOrderResponse, OrderStatus } from "@/lib/types/admin";

interface OrderStatusActionsProps {
  orderId: number;
  currentStatus: OrderStatus;
}

const CONFIRM_DESCRIPTION: Partial<Record<OrderStatus, string>> = {
  CANCELLED:
    "O pedido será cancelado e o estoque reservado volta para o catálogo, ficando disponível para venda.",
  PAID:
    "Normalmente é o webhook da Stripe que marca um pedido como pago. Confirmar aqui declara que o pagamento entrou por outro caminho.",
};

export function OrderStatusActions({ orderId, currentStatus }: OrderStatusActionsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingTarget, setPendingTarget] = useState<OrderStatus | null>(null);

  const targets = ORDER_STATUS_TRANSITIONS[currentStatus];

  const mutation = useMutation({
    mutationFn: async (newStatus: OrderStatus) => {
      const response = await apiClient.patch<AdminOrderResponse>(
        `/v1/admin/orders/${orderId}/status`,
        undefined,
        { params: { newStatus } },
      );
      return response.data;
    },
    onSuccess: (updated) => {
      setPendingTarget(null);
      toast(`Pedido #${orderId} agora está como "${translateOrderStatus(updated.status)}".`, "success");
      void queryClient.invalidateQueries({ queryKey: ["admin", "order", orderId] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      if (updated.status === "CANCELLED") {
        void queryClient.invalidateQueries({ queryKey: ["products"] });
      }
    },
    onError: (error) => {
      setPendingTarget(null);
      toast(formatAdminError(error, "Não foi possível mudar o status do pedido."), "error");
    },
  });

  const run = (target: OrderStatus) => {
    if (requiresConfirmation(target)) {
      setPendingTarget(target);
      return;
    }
    mutation.mutate(target);
  };

  if (targets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {translateOrderStatus(currentStatus)} é um estado final: não há mudança de status disponível.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {targets.map((target, index) => (
          <button
            key={target}
            type="button"
            onClick={() => run(target)}
            disabled={mutation.isPending}
            className={`px-5 py-2.5 text-xs font-semibold tracking-[0.15em] uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              index === 0
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "border border-muted text-muted-foreground hover:text-foreground hover:border-foreground"
            }`}
          >
            {orderStatusActionLabel(target)}
          </button>
        ))}
      </div>

      <ConfirmDialog
        open={pendingTarget !== null}
        title={pendingTarget ? orderStatusActionLabel(pendingTarget) : ""}
        description={
          (pendingTarget && CONFIRM_DESCRIPTION[pendingTarget]) ??
          `O pedido passará para "${pendingTarget ? translateOrderStatus(pendingTarget) : ""}".`
        }
        warning={
          pendingTarget && isRefundWarningRequired(currentStatus, pendingTarget)
            ? "Este pedido já foi pago. O valor NÃO será estornado automaticamente — faça o estorno pelo painel da Stripe."
            : undefined
        }
        confirmLabel="Confirmar"
        isPending={mutation.isPending}
        onConfirm={() => pendingTarget && mutation.mutate(pendingTarget)}
        onCancel={() => setPendingTarget(null)}
      />
    </>
  );
}
