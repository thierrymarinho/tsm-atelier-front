"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { CheckoutForm } from "./CheckoutForm";

let stripePromise: Promise<Stripe | null> | null = null;

function getStripe(): Promise<Stripe | null> | null {
  if (stripePromise) return stripePromise;

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    console.error(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set — payments are disabled. " +
        "See .env.example.",
    );
    return null;
  }

  stripePromise = loadStripe(publishableKey);
  return stripePromise;
}

interface StripePaymentElementsProps {
  clientSecret: string;
  totalAmount: number;
}

export default function StripePaymentElements({
  clientSecret,
  totalAmount,
}: StripePaymentElementsProps) {
  const stripe = getStripe();

  if (!stripe) {
    return (
      <div className="text-center flex flex-col gap-3 py-4">
        <p className="text-sm font-semibold tracking-widest uppercase">
          Pagamento indisponível
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Não foi possível inicializar o processador de pagamentos. Tente novamente
          mais tarde ou entre em contato com o suporte.
        </p>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#000000',
            colorBackground: '#ffffff',
            colorText: '#000000',
            colorDanger: '#df1b41',
            fontFamily: 'Inter, system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '0px',
          },
        },
      }}
    >
      <CheckoutForm totalAmount={totalAmount} />
    </Elements>
  );
}
