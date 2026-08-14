import type { Metadata } from "next";
import { DashboardContent } from "./DashboardContent";

export const metadata: Metadata = {
  title: "Painel administrativo | TSM Atelier",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return (
    <>
      <h1 className="font-serif text-lg md:text-2xl tracking-wide uppercase text-foreground mb-8">
        Dashboard
      </h1>

      <DashboardContent />
    </>
  );
}
