"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { X, Lock, Loader2 } from "lucide-react";

const StripePaymentElements = dynamic(() => import("./StripePaymentElements"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

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
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in-fast"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <div
          className="relative w-full max-w-[500px] max-h-full bg-background shadow-2xl flex flex-col pointer-events-auto animate-zoom-in"
        >
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

        <div className="flex-1 overflow-y-auto p-6">
          <StripePaymentElements clientSecret={clientSecret} totalAmount={totalAmount} />
        </div>
        </div>
      </div>
    </>
  );
}
