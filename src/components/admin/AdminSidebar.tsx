"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Shirt, Layers, Boxes, History, Store, LogOut } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Pedidos", icon: Receipt },
  { href: "/admin/products", label: "Produtos", icon: Shirt },
  { href: "/admin/collections", label: "Coleções", icon: Layers },
  { href: "/admin/stock", label: "Estoque", icon: Boxes },
  { href: "/admin/audit", label: "Histórico", icon: History },
];

function isActive(pathname: string | null, item: NavItem): boolean {
  if (!pathname) return false;
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-6 border-b border-muted">
        <Link href="/admin" onClick={onNavigate} className="block">
          <span className="font-serif text-sm tracking-widest uppercase text-foreground">
            TSM Atelier
          </span>
          <span className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1">
            Painel
          </span>
        </Link>
      </div>

      <nav className="flex-1 py-4" aria-label="Seções do painel">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                active
                  ? "text-foreground font-medium border-l-2 border-foreground bg-muted/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border-l-2 border-transparent"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-muted py-4">
        {user && (
          <div className="px-6 pb-3">
            <p className="text-sm text-foreground truncate">{user.name || user.firstName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}

        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-6 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Store className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
          Ver a loja
        </Link>

        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            void logout();
          }}
          className="w-full flex items-center gap-3 px-6 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
          Sair
        </button>
      </div>
    </div>
  );
}
