"use client";

import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Loader2, Lock } from "lucide-react";

export function CheckoutForm({ totalAmount }: { totalAmount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
    });

    if (error) {
      setErrorMessage(error.message || "Ocorreu um erro ao processar o pagamento.");
    }

    setIsProcessing(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="bg-white p-6 border border-muted shadow-sm">
        <h2 className="text-sm font-semibold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          Pagamento Seguro
        </h2>
        
        <PaymentElement />
        
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-sm text-red-600">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-full mt-8 py-4 bg-foreground text-background text-xs tracking-widest uppercase font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
          {isProcessing ? "Processando..." : `Pagar ${formatPrice(totalAmount)}`}
        </button>
        
        <p className="text-xs text-muted-foreground text-center mt-4">
          Suas informações de pagamento são criptografadas e processadas de forma segura.
        </p>
      </div>
    </form>
  );
}
