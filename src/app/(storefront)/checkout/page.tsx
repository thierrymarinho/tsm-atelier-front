"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { useAuthPanel } from "@/lib/context/AuthPanelContext";
import { rememberAuthIntent } from "@/lib/auth-intent";
import { useCart } from "@/lib/context/CartContext";
import { outOfStockMessage } from "@/lib/checkout-errors";
import { SignInRequired } from "@/components/auth/SignInRequired";
import { AddressSelector } from "@/components/checkout/AddressSelector";
import { apiClient } from "@/lib/api/client";
import { CheckoutRequestDTO, CheckoutResponseDTO } from "@/lib/types/api";
import { Loader2, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PaymentDrawer } from "@/components/checkout/PaymentDrawer";

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { openAuthPanel } = useAuthPanel();
  const { items, cartTotal, isLoaded: isCartLoaded, refreshCart } = useCart();

  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [checkoutData, setCheckoutData] = useState<CheckoutResponseDTO | null>(null);
  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
  const [hasStockConflict, setHasStockConflict] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      rememberAuthIntent("/checkout");
      openAuthPanel();
    }
  }, [isAuthenticated, isAuthLoading, openAuthPanel]);

  useEffect(() => {
    if (isAuthenticated && isCartLoaded && items.length === 0) {
      router.push("/cart");
    }
  }, [isAuthenticated, isCartLoaded, items, router]);

  const handleCreateOrder = async () => {
    if (!selectedAddressId) return;

    setIsCreatingOrder(true);
    setOrderError("");
    setHasStockConflict(false);

    try {
      const payload: CheckoutRequestDTO = {
        addressId: selectedAddressId,
        items: items.map(item => ({
          skuId: item.skuId,
          quantity: item.quantity
        }))
      };

      const { data } = await apiClient.post<CheckoutResponseDTO>("/v1/orders/checkout", payload);
      setCheckoutData(data);
      setClientSecret(data.clientSecret);
      setIsPaymentDrawerOpen(true);
    } catch (error: any) {
      const errorData = error?.response?.data;
      const status = error?.response?.status ?? errorData?.status;

      if (status === 409) {
        setOrderError(outOfStockMessage(errorData ?? {}, items));
        setHasStockConflict(true);
        await refreshCart();
      } else if (status === 422 && errorData?.fields) {
        const fieldErrors = Object.entries(errorData.fields)
          .map(([field, msg]) => `- ${field}: ${msg}`)
          .join("\n");
        setOrderError(`Erro de validação:\n${fieldErrors}`);
      } else {
        setOrderError(errorData?.detail || "Erro ao inicializar o pagamento. Tente novamente.");
      }
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const needsCartFix = hasStockConflict || items.some((item) => !item.available);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  if (!isAuthLoading && !isAuthenticated) {
    return (
      <SignInRequired
        title="Entre para finalizar"
        description="Faça login para concluir sua compra. Seu carrinho será mantido e sincronizado com a sua conta."
      />
    );
  }

  if (isAuthLoading || !isCartLoaded || items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-24">
      <h1 className="font-serif text-2xl tracking-widest uppercase mb-10 text-center">
        Finalizar Compra
      </h1>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">

        <div className="flex-1 flex flex-col gap-10">

          <div>
            <h2 className="text-sm font-semibold tracking-widest uppercase mb-6 flex items-center gap-4">
              <span className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs">1</span>
              Entrega
            </h2>
            <AddressSelector onAddressSelected={setSelectedAddressId} />

            <button
              onClick={clientSecret ? () => setIsPaymentDrawerOpen(true) : handleCreateOrder}
              disabled={!selectedAddressId || isCreatingOrder || needsCartFix}
              className="w-full mt-6 py-4 bg-foreground text-background text-xs uppercase tracking-widest font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCreatingOrder && <Loader2 className="w-4 h-4 animate-spin" />}
              {clientSecret ? "Finalizar Pagamento" : "Continuar para Pagamento"}
            </button>

            {orderError && (
              <div className="mt-4 flex flex-col items-start gap-2">
                <p className="text-sm text-red-500 whitespace-pre-line leading-relaxed">{orderError}</p>
                {needsCartFix && (
                  <Link
                    href="/cart"
                    className="text-xs uppercase tracking-widest underline underline-offset-4 hover:opacity-70 transition-opacity"
                  >
                    Ir para o carrinho
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-[420px] flex-shrink-0">
          <div className="bg-muted/5 border border-muted p-6 sm:p-8 lg:sticky lg:top-24">
            <h2 className="text-sm font-semibold tracking-widest uppercase mb-6 flex items-center gap-2 pb-4 border-b border-muted">
              <ShoppingBag className="w-4 h-4" />
              Resumo do Pedido
            </h2>

            <div className="flex flex-col gap-4 mb-6 max-h-80 overflow-y-auto pr-2">
              {items.map(item => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-16 h-20 relative bg-muted/20 flex-shrink-0">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover object-top"
                      sizes="64px"
                    />
                  </div>
                  <div className="flex flex-col justify-center flex-1 text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <span className="line-clamp-1">{item.name}</span>
                      {!item.available && (
                        <span className="bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded font-semibold text-[10px] tracking-wider uppercase flex-shrink-0">
                          Indisponível
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground text-xs mt-1">Cor: {item.colorName}</span>
                    <span className="text-muted-foreground text-xs">Tam: {item.size} | Qtd: {item.quantity}</span>
                    <span className="font-medium mt-1">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 pt-6 border-t border-muted">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Frete</span>
                {checkoutData ? (
                  <span className={checkoutData.shippingFee === 0 ? "text-green-600 font-medium uppercase tracking-widest text-xs" : ""}>
                    {checkoutData.shippingFee === 0 ? "Grátis" : formatPrice(checkoutData.shippingFee)}
                  </span>
                ) : (
                  <span className="text-green-600 font-medium uppercase tracking-widest text-xs">Grátis</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between font-semibold text-base mt-6 pt-6 border-t border-foreground">
              <span>Total Estimado</span>
              <span>
                {checkoutData
                  ? formatPrice(checkoutData.totalAmount)
                  : formatPrice(cartTotal)
                }
              </span>
            </div>
          </div>
        </div>

      </div>

      <PaymentDrawer
        isOpen={isPaymentDrawerOpen}
        onClose={() => setIsPaymentDrawerOpen(false)}
        clientSecret={clientSecret}
        totalAmount={checkoutData?.totalAmount || 0}
      />
    </div>
  );
}
