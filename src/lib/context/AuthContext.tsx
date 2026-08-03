"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { apiClient } from "@/lib/api/client";
import {
  UserResponseDTO,
  LoginRequestDTO,
  RegisterRequestDTO,
  RegisterResponseDTO,
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

  const fetchMe = useCallback(async () => {
    try {
      const response = await apiClient.get<UserResponseDTO>("/v1/auth/me");
      setUser(response.data);
    } catch {
      // Not authenticated or token expired — user is a visitor
      setUser(null);
    }
  }, []);

  // On mount, try to recover the session via /me
  useEffect(() => {
    fetchMe().finally(() => setIsLoading(false));
  }, [fetchMe]);

  const login = async (data: LoginRequestDTO) => {
    await apiClient.post("/v1/auth/login", data);
    
    // Sync local cart to backend silently
    try {
      const storedCart = localStorage.getItem("tsm_cart");
      if (storedCart) {
        const localItems = JSON.parse(storedCart);
        if (localItems.length > 0) {
          const syncPayload = {
            items: localItems.map((item: any) => ({
              skuId: item.skuId,
              quantity: item.quantity
            }))
          };
          await apiClient.post("/v1/cart/sync", syncPayload);
          // Clear local storage so API takes over completely
          localStorage.removeItem("tsm_cart");
        }
      }
    } catch (error) {
      console.warn("Failed to sync local cart to backend", error);
    }

    await fetchMe();
  };

  const register = async (data: RegisterRequestDTO): Promise<RegisterResponseDTO> => {
    // POST /register → NO cookies set. Returns { message }.
    // User must verify email before they can log in.
    const response = await apiClient.post<RegisterResponseDTO>("/v1/auth/register", data);
    return response.data;
  };

  const verifyEmail = async (token: string) => {
    // GET /verify-email?token=xxx → cookies are set if valid
    await apiClient.get("/v1/auth/verify-email", { params: { token } });
    // Cookies are now set — fetch full profile
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
