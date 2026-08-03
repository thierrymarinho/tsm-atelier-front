"use client";

import { useEffect, useState } from "react";
import { X, Lock } from "lucide-react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { CheckoutForm } from "./CheckoutForm";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientSecret: string | null;
  totalAmount: number;
}

export function PaymentDrawer({ isOpen, onClose, clientSecret, totalAmount }: PaymentDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted || !isOpen || !clientSecret) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-in fade-in"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        {/* Modal Content */}
        <div 
          className="relative w-full max-w-[500px] max-h-full bg-background shadow-2xl flex flex-col pointer-events-auto animate-in fade-in zoom-in-95 duration-300"
        >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-muted">
          <h2 className="text-sm font-semibold tracking-widest uppercase flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            Pagamento Seguro
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Elements 
            stripe={stripePromise} 
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
                }
              } 
            }}
          >
            <CheckoutForm totalAmount={totalAmount} />
          </Elements>
        </div>
        </div>
      </div>
    </>
  );
}
