"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { apiClient, onSessionExpired } from "@/lib/api/client";
import { useToast } from "@/lib/context/ToastContext";
import { CART_STORAGE_KEY, readStoredCart } from "@/lib/cart-storage";
import {
  UserResponseDTO,
  LoginRequestDTO,
  RegisterRequestDTO,
  RegisterResponseDTO,
  VerifyEmailRequestDTO,
} from "@/lib/types/api";

interface AuthContextType {
  user: UserResponseDTO | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequestDTO) => Promise<void>;
  register: (data: RegisterRequestDTO) => Promise<RegisterResponseDTO>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponseDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchMe = useCallback(async () => {
    try {
      const response = await apiClient.get<UserResponseDTO>("/v1/auth/me");
      setUser(response.data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchMe().finally(() => setIsLoading(false));
  }, [fetchMe]);

  const hasSession = user !== null;
  useEffect(() => {
    return onSessionExpired((reason) => {
      if (!hasSession) return;

      setUser(null);
      toast(
        reason === "revoked"
          ? "Por segurança, encerramos o acesso em todos os dispositivos: detectamos um uso suspeito da sua sessão. Entre novamente e, se não reconhece o acesso, troque sua senha."
          : "Sua sessão expirou. Entre novamente para continuar.",
        "error",
      );
    });
  }, [hasSession, toast]);

  const syncGuestCart = useCallback(async () => {
    try {
      const localItems = readStoredCart();
      if (localItems.length > 0) {
        const syncPayload = {
          items: localItems.map((item) => ({
            skuId: item.skuId,
            quantity: item.quantity,
          })),
        };
        await apiClient.post("/v1/cart/sync", syncPayload);
      }
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to sync local cart to backend", error);
    }
  }, []);

  const login = async (data: LoginRequestDTO) => {
    await apiClient.post("/v1/auth/login", data);
    await syncGuestCart();
    await fetchMe();
  };

  const register = async (data: RegisterRequestDTO): Promise<RegisterResponseDTO> => {
    const response = await apiClient.post<RegisterResponseDTO>("/v1/auth/register", data);
    return response.data;
  };

  const verifyEmail = async (token: string) => {
    const payload: VerifyEmailRequestDTO = { token };
    await apiClient.post("/v1/auth/verify-email", payload);
    await syncGuestCart();
    await fetchMe();
  };

  const resendVerificationEmail = async (email: string) => {
    await apiClient.post("/v1/auth/resend-verification", { email });
  };

  const logout = async () => {
    try {
      await apiClient.post("/v1/auth/logout");
    } catch (error) {
      console.warn("Logout request failed (likely already expired), continuing local logout.", error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        verifyEmail,
        resendVerificationEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
