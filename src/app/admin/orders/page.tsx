import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { OrdersContent } from "./OrdersContent";

export const metadata: Metadata = {
  title: "Pedidos | Painel TSM Atelier",
  robots: { index: false, follow: false },
};

export default function AdminOrdersPage() {
  return (
    <>
      <h1 className="font-serif text-lg md:text-2xl tracking-wide uppercase text-foreground mb-8">
        Pedidos
      </h1>

      <Suspense
        fallback={
          <div className="min-h-[40vh] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <OrdersContent />
      </Suspense>
    </>
  );
}
