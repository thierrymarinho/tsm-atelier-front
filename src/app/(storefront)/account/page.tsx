"use client";

import { useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, User, Package, MapPin, Mail, LayoutDashboard } from "lucide-react";

import { translateRole } from "@/lib/utils/translations";
import { AddressManager } from "@/components/account/AddressManager";
import { OrdersList } from "@/components/account/OrdersList";

type Tab = "overview" | "orders" | "addresses";

export default function AccountPage() {
  const { user, logout, isAdminArea } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (!user) return null;

  const initials = (user.firstName?.charAt(0) || "") + (user.lastName?.charAt(0) || "");

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-24 min-h-screen">

      <div className="mb-12 border-b border-muted pb-8">
        <h1 className="font-serif text-3xl tracking-widest uppercase text-foreground">
          Minha Conta
        </h1>
        <p className="text-sm text-muted-foreground tracking-wide mt-2">
          Bem-vindo de volta, {user.firstName}.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">

        <div className="w-full lg:w-64 flex-shrink-0">
          <nav className="flex flex-row lg:flex-col gap-2 lg:gap-4 overflow-x-auto pb-4 lg:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wider uppercase whitespace-nowrap transition-colors ${
                activeTab === "overview"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              }`}
            >
              <User className="w-4 h-4" />
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wider uppercase whitespace-nowrap transition-colors ${
                activeTab === "orders"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              }`}
            >
              <Package className="w-4 h-4" />
              Meus Pedidos
            </button>
            <button
              onClick={() => setActiveTab("addresses")}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wider uppercase whitespace-nowrap transition-colors ${
                activeTab === "addresses"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              }`}
            >
              <MapPin className="w-4 h-4" />
              Endereços
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wider uppercase whitespace-nowrap text-red-500 hover:bg-red-50 transition-colors lg:mt-8"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </nav>
        </div>

        <div className="flex-1 min-h-[500px]">

          {activeTab === "overview" && (
            <div className="animate-fade-in-fast">

              <div className="flex flex-wrap items-center justify-between gap-3 mb-8 border-b border-muted pb-4">
                <h2 className="text-sm font-semibold tracking-widest uppercase">
                  Dados Pessoais
                </h2>

                {isAdminArea && (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 border border-muted px-4 py-2 text-xs font-medium tracking-widest uppercase text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />
                    Painel administrativo
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-6 mb-10">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-xl font-semibold tracking-wide text-foreground">
                  {initials.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-lg">{user.name || `${user.firstName} ${user.lastName}`}</p>
                  <p className="text-muted-foreground text-sm mt-1">{translateRole(user.role)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
                <div className="flex flex-col gap-1">
                  <span className="text-xs tracking-wide text-muted-foreground uppercase">Nome</span>
                  <span className="text-sm font-medium text-foreground">{user.firstName}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs tracking-wide text-muted-foreground uppercase">Sobrenome</span>
                  <span className="text-sm font-medium text-foreground">{user.lastName}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs tracking-wide text-muted-foreground uppercase">Email</span>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{user.email}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="animate-fade-in-fast">
              <h2 className="text-sm font-semibold tracking-widest uppercase mb-8 border-b border-muted pb-4">
                Meus Pedidos
              </h2>
              <OrdersList />
            </div>
          )}

          {activeTab === "addresses" && (
            <div className="animate-fade-in-fast">
              <h2 className="text-sm font-semibold tracking-widest uppercase mb-8 border-b border-muted pb-4">
                Meus Endereços
              </h2>
              <AddressManager />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
