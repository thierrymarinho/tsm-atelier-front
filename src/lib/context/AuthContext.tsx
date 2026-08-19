"use client";

import { createContext, useContext, useEffect, useCallback, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, isBackendUnavailable, onSessionExpired } from "@/lib/api/client";
import { useToast } from "@/lib/context/ToastContext";
import { CART_STORAGE_KEY, readStoredCart } from "@/lib/cart-storage";
import { canOpenAdmin, canSeeOrders, canWrite } from "@/lib/auth/roles";
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
  isAdminArea: boolean;
  canWrite: boolean;
  canSeeOrders: boolean;
  login: (data: LoginRequestDTO) => Promise<void>;
  register: (data: RegisterRequestDTO) => Promise<RegisterResponseDTO>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AUTH_ME_QUERY_KEY = ["auth", "me"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // A sessão é query do React Query, e não estado próprio, por uma razão de
  // recuperação: assim ela entra no cache, o BackendUnavailableBanner a vê
  // falhar e a refaz junto das outras quando o backend acorda. Como efeito de
  // montagem solto — que foi como isto nasceu — ela rodava uma vez e nunca
  // mais: o catálogo voltava do cold start e a sessão só com F5.
  const sessionQuery = useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: async () => {
      try {
        const response = await apiClient.get<UserResponseDTO>("/v1/auth/me");
        return response.data;
      } catch (error) {
        // Backend fora não é resposta sobre a sessão. Lançar mantém o dado
        // anterior no cache e acende o aviso; devolver `null` aqui afirmaria
        // que o visitante é anônimo, e era isso que deslogava na tela quem
        // chegava durante a hibernação.
        if (isBackendUnavailable(error)) throw error;
        return null;
      }
    },
  });

  const user = sessionQuery.data ?? null;

  // Só a primeira falha deixa a sessão realmente desconhecida. Depois de uma
  // resposta, o React Query preserva o dado através do erro: quem estava
  // logado continua logado, e quem já se sabia anônimo continua anônimo.
  const isSessionUnknown = sessionQuery.isError && sessionQuery.data === undefined;
  const isLoading = sessionQuery.isPending || isSessionUnknown;

  const setUser = useCallback(
    (next: UserResponseDTO | null) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, next);
    },
    [queryClient],
  );

  const fetchMe = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: AUTH_ME_QUERY_KEY, exact: true });
  }, [queryClient]);

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
  }, [hasSession, toast, setUser]);

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
        isAdminArea: canOpenAdmin(user),
        canWrite: canWrite(user),
        canSeeOrders: canSeeOrders(user),
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
