export interface CartItem {
  id: string | number;
  productId: number;
  skuId: number;
  skuCode?: string;
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

export const CART_STORAGE_KEY = "tsm_cart";

export function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CartItem =>
        item !== null &&
        typeof item === "object" &&
        typeof (item as CartItem).skuId === "number" &&
        typeof (item as CartItem).quantity === "number" &&
        typeof (item as CartItem).price === "number",
    );
  } catch (error) {
    console.error("Failed to parse stored cart", error);
    return [];
  }
}

export function readStoredCart(): CartItem[] {
  return parseStoredCart(localStorage.getItem(CART_STORAGE_KEY));
}
