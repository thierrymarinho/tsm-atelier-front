"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/lib/context/AuthContext";
import { AuthPanelProvider } from "@/lib/context/AuthPanelContext";
import { CartProvider } from "@/lib/context/CartContext";
import { ToastProvider } from "@/lib/context/ToastContext";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <AuthPanelProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </AuthPanelProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
