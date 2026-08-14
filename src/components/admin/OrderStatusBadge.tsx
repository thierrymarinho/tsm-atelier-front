import { translateOrderStatus } from "@/lib/admin/order-status";
import type { OrderStatus } from "@/lib/types/admin";

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-50 text-amber-800 border-amber-200",
  PAYMENT_FAILED: "bg-red-50 text-red-700 border-red-200",
  PAID: "bg-emerald-50 text-emerald-800 border-emerald-200",
  SHIPPED: "bg-blue-50 text-blue-800 border-blue-200",
  DELIVERED: "bg-muted text-muted-foreground border-muted",
  CANCELLED: "bg-muted text-muted-foreground border-muted line-through",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.1em] whitespace-nowrap ${
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-muted"
      }`}
    >
      {translateOrderStatus(status)}
    </span>
  );
}
