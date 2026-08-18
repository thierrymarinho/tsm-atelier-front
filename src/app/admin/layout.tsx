"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Eye, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

const WRITE_ONLY_PREFIXES = ["/admin/orders", "/admin/products/new", "/admin/collections/new"];

function ReadOnlyNotice() {
  return (
    <div className="mb-8 flex items-start gap-3 border border-muted bg-muted/30 px-4 py-3">
      <Eye className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" strokeWidth={1.5} />
      <p className="text-xs text-muted-foreground leading-relaxed">
        <span className="text-foreground">Conta de demonstração: somente leitura.</span> O painel
        abre inteiro, mas nada aqui grava — criar, salvar, excluir, restaurar, ajustar estoque e
        enviar imagem estão desligados, e pedidos ficam de fora por conterem dados de clientes.
      </p>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAdminArea, canWrite } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);

  const needsWrite = WRITE_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  const isBlocked = isAdminArea && !canWrite && needsWrite;

  useEffect(() => {
    if (isLoading) return;
    if (!isAdminArea) router.replace("/");
    else if (isBlocked) router.replace("/admin");
  }, [isLoading, isAdminArea, isBlocked, router]);

  const [syncedPath, setSyncedPath] = useState(pathname);
  if (syncedPath !== pathname) {
    setSyncedPath(pathname);
    setIsDrawerOpen(false);
  }

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsDrawerOpen(false);
      drawerTriggerRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isDrawerOpen]);

  if (!isAdminArea || isBlocked) return null;

  return (
    <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[240px_1fr] lg:items-stretch">
      <aside className="hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-dvh border-r border-muted bg-background">
        <AdminSidebar />
      </aside>

      <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 border-b border-muted bg-background">
        <button
          ref={drawerTriggerRef}
          type="button"
          aria-label="Abrir menu do painel"
          aria-expanded={isDrawerOpen}
          onClick={() => setIsDrawerOpen(true)}
          className="p-1 hover:opacity-70 transition-opacity"
        >
          <Menu className="w-5 h-5" strokeWidth={1.5} />
        </button>
        <span className="font-serif text-sm tracking-widest uppercase">Painel</span>
      </div>

      {isDrawerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu do painel"
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-full max-w-[280px] h-dvh bg-background border-r border-muted flex flex-col"
          >
            <div className="flex justify-end px-4 pt-4">
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => {
                  setIsDrawerOpen(false);
                  drawerTriggerRef.current?.focus();
                }}
                className="p-1 hover:opacity-70 transition-opacity"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AdminSidebar onNavigate={() => setIsDrawerOpen(false)} />
            </div>
          </div>
        </>
      )}

      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-8 lg:py-10">
        {!canWrite && <ReadOnlyNotice />}
        {children}
      </main>
    </div>
  );
}
