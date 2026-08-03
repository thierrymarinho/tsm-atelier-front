"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { apiClient } from "@/lib/api/client";
import { useToast } from "@/lib/context/ToastContext";
import { CartResponseDTO, CartItemResponseDTO } from "@/lib/types/api";

export interface CartItem {
  id: string | number; // string for local (productId-colorHex-size), number for API cart item id
  productId: number;
  skuId: number;
  name: string;
  slug: string;
  colorName: string;
  colorHex: string;
  size: string;
  price: number;
  quantity: number;
  imageUrl: string;
  stockQuantity: number;
  available: boolean;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id" | "quantity">) => Promise<void>;
  removeItem: (id: string | number) => Promise<void>;
  updateQuantity: (id: string | number, quantity: number) => Promise<void>;
  clearCart: () => void;
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart data based on auth status
  const fetchApiCart = useCallback(async () => {
    try {
      const response = await apiClient.get<CartResponseDTO>("/v1/cart");
      // Map API DTO to internal CartItem structure
      const apiItems: CartItem[] = response.data.items.map((i) => ({
        id: i.id, // Number ID from API
        productId: i.productId,
        skuId: i.skuId,
        name: i.productName,
        slug: i.productSlug,
        colorName: i.colorName,
        colorHex: "", // API does not return colorHex
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

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      fetchApiCart().finally(() => setIsLoaded(true));
    } else {
      try {
        const storedCart = localStorage.getItem("tsm_cart");
        if (storedCart) {
          setItems(JSON.parse(storedCart));
        }
      } catch (error) {
        console.error("Failed to load cart from local storage", error);
      }
      setIsLoaded(true);
    }
  }, [isAuthenticated, fetchApiCart]);

  // Save to local storage ONLY if not authenticated
  useEffect(() => {
    if (isLoaded && !isAuthenticated) {
      localStorage.setItem("tsm_cart", JSON.stringify(items));
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
    if (isAuthenticated) {
      try {
        await apiClient.post("/v1/cart/items", { skuId: item.skuId, quantity: 1 });
        await fetchApiCart(); // Refresh from server
        setIsCartOpen(true);
      } catch (error) {
        handleApiError(error);
      }
    } else {
      // Local Storage approach
      const id = `${item.productId}-${item.colorHex}-${item.size}`;
      setItems((prev) => {
        const existingItem = prev.find((i) => i.id === id);
        if (existingItem) {
          // If it exists, just increase quantity
          const newQty = existingItem.quantity + 1;
          const maxAllowed = Math.min(10, existingItem.stockQuantity);
          if (newQty > maxAllowed) {
            toast(`Limite máximo atingido. Só temos ${existingItem.stockQuantity} unidades disponíveis.`, "error");
            return prev; // don't increase
          }
          return prev.map((i) => 
            i.id === id ? { ...i, quantity: newQty } : i
          );
        } else {
          // Add new item with quantity 1
          return [...prev, { ...item, id, quantity: 1 }];
        }
      });
      setIsCartOpen(true);
    }
  };

  const removeItem = async (id: string | number) => {
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
      setItems((prev) => {
        const existingItem = prev.find((i) => i.id === id);
        if (existingItem) {
          const maxAllowed = Math.min(10, existingItem.stockQuantity);
          if (quantity > maxAllowed) {
            toast(`Infelizmente, só temos ${existingItem.stockQuantity} unidades deste produto disponíveis no momento.`, "error");
            quantity = maxAllowed;
          }
        }
        return prev.map((item) => (item.id === id ? { ...item, quantity } : item));
      });
    }
  };

  const clearCart = () => {
    setItems([]);
  };

  const cartTotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = items.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
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
