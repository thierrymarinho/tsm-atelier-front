"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { useAuthPanel } from "@/lib/context/AuthPanelContext";
import { rememberAuthIntent } from "@/lib/auth-intent";
import { SignInRequired } from "@/components/auth/SignInRequired";

interface RequireAuthProps {
  children: ReactNode;
  title: string;
  description: string;
}

export function RequireAuth({ children, title, description }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { openAuthPanel } = useAuthPanel();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (pathname) rememberAuthIntent(pathname);
      openAuthPanel();
    }
  }, [isLoading, isAuthenticated, openAuthPanel, pathname]);

  if (isLoading) {
    return (
      <div className="flex-1 w-full flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 text-foreground animate-spin" strokeWidth={1.5} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SignInRequired title={title} description={description} />;
  }

  return <>{children}</>;
}
