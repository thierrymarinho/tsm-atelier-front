import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />

      <main className="flex-1 flex flex-col overflow-x-clip">{children}</main>

      <Footer />
    </>
  );
}
