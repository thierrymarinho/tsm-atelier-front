"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { OrderResponseDTO, PaginatedResponse } from "@/lib/types/api";
import { Loader2, Package, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PaymentDrawer } from "@/components/checkout/PaymentDrawer";

export function OrdersList() {
  const [orders, setOrders] = useState<OrderResponseDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<OrderResponseDTO | null>(null);
  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      // Assuming paginated response based on API guide
      const { data } = await apiClient.get<PaginatedResponse<OrderResponseDTO>>("/v1/orders/my-orders");
      setOrders(data.content);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError("Não foi possível carregar os pedidos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(date);
  };

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'PENDING_PAYMENT': 'Aguardando Pagamento',
      'PAID': 'Pago',
      'SHIPPED': 'Enviado',
      'DELIVERED': 'Entregue',
      'CANCELED': 'Cancelado'
    };
    return statusMap[status] || status;
  };

  const handlePayNow = (order: OrderResponseDTO) => {
    setSelectedOrderForPayment(order);
    setIsPaymentDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-500">
        {error}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-16 bg-muted/5 border border-muted">
        <Package className="w-12 h-12 text-muted-foreground/30 mb-6" strokeWidth={1} />
        <p className="text-muted-foreground mb-8">
          Você ainda não realizou nenhuma compra.
        </p>
        <Link
          href="/"
          className="px-8 py-3 bg-foreground text-background text-xs tracking-widest uppercase font-medium hover:opacity-90 transition-opacity"
        >
          Explorar Coleções
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {orders.map((order) => (
        <div key={order.id} className="border border-muted bg-background">
          
          {/* Order Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b border-muted bg-muted/5 gap-4">
            <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-widest">Pedido</span>
                <span className="font-medium">#{order.id.toString().padStart(4, '0')}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-widest">Data</span>
                <span className="font-medium">{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-widest">Total</span>
                <span className="font-medium">{formatPrice(order.totalAmount)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-widest">Status</span>
                <span className="font-medium text-foreground">{translateStatus(order.status)}</span>
              </div>
            </div>
            {order.status === 'PENDING_PAYMENT' && order.clientSecret && (
              <button
                onClick={() => handlePayNow(order)}
                className="mt-4 sm:mt-0 py-2 px-6 bg-foreground text-background text-xs tracking-widest uppercase font-medium hover:opacity-90 transition-opacity"
              >
                Pagar Agora
              </button>
            )}
          </div>

          {/* Order Items */}
          <div className="p-4 sm:p-6 flex flex-col gap-6">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="w-20 h-24 relative bg-muted flex-shrink-0 flex items-center justify-center">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      className="object-cover object-top"
                      sizes="80px"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-muted-foreground/30" />
                  )}
                </div>
                <div className="flex flex-col justify-center flex-1 text-sm">
                  <span className="font-medium">{item.productName}</span>
                  <span className="text-muted-foreground mt-1">Cor: {item.color}</span>
                  <span className="text-muted-foreground">Tamanho: {item.size}</span>
                  <div className="flex justify-between items-end mt-2">
                    <span className="text-muted-foreground">Qtd: {item.quantity}</span>
                    <span className="font-medium">{formatPrice(item.priceAtPurchase)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
        </div>
      ))}

      <PaymentDrawer 
        isOpen={isPaymentDrawerOpen}
        onClose={() => setIsPaymentDrawerOpen(false)}
        clientSecret={selectedOrderForPayment?.clientSecret || null}
        totalAmount={selectedOrderForPayment?.totalAmount || 0}
      />
    </div>
  );
}
