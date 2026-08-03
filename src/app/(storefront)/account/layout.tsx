"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex-1 w-full flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 text-foreground animate-spin" strokeWidth={1.5} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
