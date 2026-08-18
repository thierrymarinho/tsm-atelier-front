"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { BackendUnavailableBanner } from "@/components/domain/BackendUnavailableBanner";
import { isBackendUnavailable } from "@/lib/api/client";
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

            // Parece invertido — normalmente é 5xx que se repete e 4xx que
            // não. Aqui é de propósito: quando o erro já é reconhecidamente
            // backend fora do ar, quem repete é a BackendUnavailableBanner, a
            // cada 15s e com o motivo na tela. O backoff silencioso do
            // TanStack (1s, 2s, 4s, e até o timeout de 30s por tentativa)
            // apenas atrasaria o aviso em segundos — ou em minutos, se o
            // Render estiver segurando a conexão durante o spin-up.
            retry: (failureCount, error) => !isBackendUnavailable(error) && failureCount < 3,
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
              <BackendUnavailableBanner />
            </CartProvider>
          </AuthPanelProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
