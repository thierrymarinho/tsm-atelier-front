import type { Metadata } from "next";
import { OrderDetailContent } from "./OrderDetailContent";

export const metadata: Metadata = {
  title: "Pedido | Painel TSM Atelier",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <OrderDetailContent orderId={id} />;
}
