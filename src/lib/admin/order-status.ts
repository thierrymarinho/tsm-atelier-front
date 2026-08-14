import type { OrderStatus } from "@/lib/types/admin";

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "PAYMENT_FAILED", "CANCELLED"],
  PAYMENT_FAILED: ["PAID", "CANCELLED"],
  PAID: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  PAYMENT_FAILED: "Pagamento falhou",
  PAID: "Pago",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

export function translateOrderStatus(status: string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
}

const ORDER_STATUS_ACTIONS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Voltar para aguardando pagamento",
  PAYMENT_FAILED: "Marcar pagamento como falho",
  PAID: "Confirmar pagamento manualmente",
  SHIPPED: "Marcar como enviado",
  DELIVERED: "Marcar como entregue",
  CANCELLED: "Cancelar pedido",
};

export function orderStatusActionLabel(target: OrderStatus): string {
  return ORDER_STATUS_ACTIONS[target];
}

export function requiresConfirmation(target: OrderStatus): boolean {
  return target === "CANCELLED" || target === "PAID";
}

export function isRefundWarningRequired(from: OrderStatus, to: OrderStatus): boolean {
  return to === "CANCELLED" && from === "PAID";
}
