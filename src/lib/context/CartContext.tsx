"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useAuthPanel } from "@/lib/context/AuthPanelContext";
import { apiClient, onSessionExpired } from "@/lib/api/client";
import { useToast } from "@/lib/context/ToastContext";
import { CartResponseDTO } from "@/lib/types/api";
import {
  CART_STORAGE_KEY,
  readStoredCart,
  type CartItem,
} from "@/lib/cart-storage";

export type { CartItem };

const EXPIRED_CART_HOLD_MS = 2 * 60 * 1000;

interface CartContextType {
  items: CartItem[];
  isLoaded: boolean;
  isLocked: boolean;
  addItem: (item: Omit<CartItem, "id" | "quantity">) => Promise<void>;
  removeItem: (id: string | number) => Promise<void>;
  updateQuantity: (id: string | number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [loadedForAuth, setLoadedForAuth] = useState<boolean | null>(null);
  const isLoaded = loadedForAuth === isAuthenticated;

  const isLocked = !isAuthenticated && !isLoaded;

  const fetchApiCart = useCallback(async () => {
    try {
      const response = await apiClient.get<CartResponseDTO>("/v1/cart");
      const apiItems: CartItem[] = response.data.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        skuId: i.skuId,
        name: i.productName,
        slug: i.productSlug,
        colorName: i.colorName,
        colorHex: "",
        size: i.size,
        price: i.unitPrice,
        quantity: i.quantity,
        imageUrl: i.coverImageUrl,
        stockQuantity: i.stockQuantity,
        available: i.available
      }));
      setItems(apiItems);
    } catch (error) {
      console.error("Failed to load cart from API", error);
    }
  }, []);

  const sessionExpiredRef = useRef(false);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReleaseTimer = useCallback(() => {
    if (releaseTimerRef.current !== null) {
      clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }
  }, []);

  const releaseHeldCart = useCallback(() => {
    clearReleaseTimer();
    if (!sessionExpiredRef.current) return;
    sessionExpiredRef.current = false;
    setItems(readStoredCart());
    setLoadedForAuth(false);
  }, [clearReleaseTimer]);

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      sessionExpiredRef.current = true;
      clearReleaseTimer();
      releaseTimerRef.current = setTimeout(releaseHeldCart, EXPIRED_CART_HOLD_MS);
    });
    return () => {
      unsubscribe();
      clearReleaseTimer();
    };
  }, [releaseHeldCart, clearReleaseTimer]);

  const { isAuthPanelOpen } = useAuthPanel();
  const wasAuthPanelOpenRef = useRef(false);

  useEffect(() => {
    const justClosed = wasAuthPanelOpenRef.current && !isAuthPanelOpen;
    wasAuthPanelOpenRef.current = isAuthPanelOpen;

    if (justClosed && !isAuthenticated) {
      releaseHeldCart();
    }
  }, [isAuthPanelOpen, isAuthenticated, releaseHeldCart]);

  useEffect(() => {
    if (isAuthenticated) {
      sessionExpiredRef.current = false;
      clearReleaseTimer();
      fetchApiCart().finally(() => setLoadedForAuth(true));
    } else if (sessionExpiredRef.current) {
    } else {
      setItems(readStoredCart());
      setLoadedForAuth(false);
    }
  }, [isAuthenticated, fetchApiCart, clearReleaseTimer]);

  useEffect(() => {
    if (isLoaded && !isAuthenticated) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isLoaded, isAuthenticated]);

  const handleApiError = (error: any) => {
    if (error.response?.status === 409) {
      const availableQuantity = error.response.data?.availableQuantity;
      if (availableQuantity !== undefined) {
        toast(`Infelizmente, só temos ${availableQuantity} unidades deste produto disponíveis no momento.`, "error");
      } else {
        toast("Falta de estoque para este produto.", "error");
      }
    } else {
      toast("Ocorreu um erro ao atualizar o carrinho.", "error");
    }
  };

  const addItem = async (item: Omit<CartItem, "id" | "quantity">) => {
    if (isLocked) releaseHeldCart();

    if (isAuthenticated) {
      try {
        await apiClient.post("/v1/cart/items", { skuId: item.skuId, quantity: 1 });
        await fetchApiCart();
        setIsCartOpen(true);
      } catch (error) {
        handleApiError(error);
      }
    } else {
      const id = `${item.productId}-${item.colorHex}-${item.size}`;

      // A decisão é tomada aqui fora, e não dentro do updater: `toast()` altera
      // o estado do ToastProvider, e updater roda durante a renderização — o
      // React recusa com "Cannot update a component while rendering a different
      // component". Ler de `items` é correto num handler de evento, que só
      // roda depois da renderização que o registrou.
      const existingItem = items.find((i) => i.id === id);

      if (!existingItem) {
        setItems((prev) => [...prev, { ...item, id, quantity: 1 }]);
      } else if (existingItem.quantity + 1 > Math.min(10, existingItem.stockQuantity)) {
        toast(`Limite máximo atingido. Só temos ${existingItem.stockQuantity} unidades disponíveis.`, "error");
      } else {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i)));
      }

      setIsCartOpen(true);
    }
  };

  const removeItem = async (id: string | number) => {
    if (isLocked) return;
    if (isAuthenticated) {
      try {
        await apiClient.delete(`/v1/cart/items/${id}`);
        await fetchApiCart();
      } catch (error) {
        handleApiError(error);
      }
    } else {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const updateQuantity = async (id: string | number, quantity: number) => {
    if (isLocked) return;

    if (quantity <= 0) {
      await removeItem(id);
      return;
    }

    if (isAuthenticated) {
      try {
        await apiClient.put(`/v1/cart/items/${id}`, { quantity });
        await fetchApiCart();
      } catch (error) {
        handleApiError(error);
      }
    } else {
      // Mesmo motivo do addItem: o aviso e o teto saem do updater, que precisa
      // ser puro. De quebra, o parâmetro `quantity` deixa de ser reatribuído.
      const existingItem = items.find((i) => i.id === id);
      let nextQuantity = quantity;

      if (existingItem) {
        const maxAllowed = Math.min(10, existingItem.stockQuantity);
        if (nextQuantity > maxAllowed) {
          toast(`Infelizmente, só temos ${existingItem.stockQuantity} unidades deste produto disponíveis no momento.`, "error");
          nextQuantity = maxAllowed;
        }
      }

      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: nextQuantity } : i)));
    }
  };

  const clearCart = useCallback(async () => {
    setItems([]);

    if (isAuthenticated) {
      try {
        await apiClient.delete("/v1/cart");
      } catch (error) {
        console.error("Failed to clear server cart", error);
      }
    } else {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, [isAuthenticated]);

  const cartTotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = items.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        isLoaded,
        isLocked,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
