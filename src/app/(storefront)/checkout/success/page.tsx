"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/context/CartContext";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function CheckoutSuccessPage() {
  const { clearCart } = useCart();
  const searchParams = useSearchParams();
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  useEffect(() => {
    // Stripe appends ?payment_intent=pi_123... on success
    const pi = searchParams.get("payment_intent");
    if (pi) {
      setPaymentIntentId(pi);
    }
    
    // Esvaziar o carrinho assim que a tela de sucesso montar
    clearCart();
    
    // We only want to run clearCart once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-32 pb-24 flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-8">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </div>
      
      <h1 className="font-serif text-3xl tracking-widest uppercase mb-4">
        Pagamento Confirmado
      </h1>
      
      <p className="text-muted-foreground mb-10 max-w-lg">
        Muito obrigado pela sua compra! O seu pedido foi recebido e já estamos preparando para envio.
        Você receberá um e-mail com os detalhes e o código de rastreio em breve.
      </p>

      {paymentIntentId && (
        <div className="bg-muted/10 border border-muted px-6 py-4 mb-10 w-full max-w-md text-sm text-left">
          <span className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">Referência do Pagamento</span>
          <span className="font-mono">{paymentIntentId}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link
          href="/account"
          className="py-4 px-8 border border-foreground text-foreground text-xs uppercase tracking-widest font-medium hover:bg-muted/30 transition-colors"
        >
          Ver meus pedidos
        </Link>
        <Link
          href="/"
          className="py-4 px-8 bg-foreground text-background text-xs uppercase tracking-widest font-medium hover:opacity-90 transition-opacity"
        >
          Continuar Comprando
        </Link>
      </div>
    </div>
  );
}
