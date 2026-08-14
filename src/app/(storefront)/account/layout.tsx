"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth
      title="Entre na sua conta"
      description="Acesse seus pedidos, endereços e dados pessoais fazendo login na sua conta."
    >
      {children}
    </RequireAuth>
  );
}
