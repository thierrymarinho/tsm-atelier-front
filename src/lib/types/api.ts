export type Category = 'CLOTHING' | 'ACCESSORY';
export type TargetAudience = 'MEN' | 'WOMEN' | 'UNISEX' | 'KIDS';
export type DisplayPosition = 'CAROUSEL_1' | 'GRID' | 'FEATURED' | 'NEW_ARRIVALS' | 'HEADER' | 'HOME_MAIN' | 'HOME_SECONDARY';

export interface Sku {
  id: number;
  size: string;
  stockQuantity: number;
}

export interface ProductColor {
  id: number;
  colorName: string;
  colorHex: string;
  coverImageUrl: string;
  hoverImageUrl?: string;
  galleryImages: string[];
  skus: Sku[];
}

export interface ProductResponseDTO {
  id: number;
  name: string;
  slug: string;
  description: string;
  fabricCompositions: {
    material: string;
    percentage: number;
  }[];
  careInstructions: string[];
  price: number;
  collectionId: number | null;
  category: Category;
  targetAudience: TargetAudience;
  active: boolean;
  colors: ProductColor[];
}

export interface ProductSummaryDTO {
  id: number;
  name: string;
  slug: string;
  price: number;
  coverImageUrl: string;
  hoverImageUrl: string;
  colorsHex: string[];
}

export interface PaginatedResponse<T> {
  content: T[];
  pageable: any;
  totalElements: number;
  totalPages: number;
}

export interface CollectionResponseDTO {
  id: number;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  heroImageUrl: string;
  portraitImageUrl: string;
  squareImageUrl: string;
  displayPosition: DisplayPosition;
  displayOrder: number;
  targetAudience: TargetAudience;
}

// --- Authentication ---

export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface LoginResponseDTO {
  email: string;
  name: string;
}

export interface RegisterRequestDTO {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface RegisterResponseDTO {
  message: string;
}

export interface UserResponseDTO {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: string;
}

export interface ApiErrorResponse {
  status: number;
  title: string;
  detail: string;
  fields?: Record<string, string>;
}

// --- Address ---

export type BrazilianState =
  | 'AC' | 'AL' | 'AP' | 'AM' | 'BA' | 'CE' | 'DF' | 'ES' | 'GO'
  | 'MA' | 'MT' | 'MS' | 'MG' | 'PA' | 'PB' | 'PR' | 'PE' | 'PI'
  | 'RJ' | 'RN' | 'RS' | 'RO' | 'RR' | 'SC' | 'SP' | 'SE' | 'TO';

export const BRAZILIAN_STATES: BrazilianState[] = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export interface AddressResponseDTO {
  id: number;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: BrazilianState;
  postalCode: string;
  isDefault: boolean;
}

export interface AddressRequestDTO {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: BrazilianState;
  postalCode: string;
  isDefault: boolean;
}

// --- Checkout ---

export interface CheckoutItemRequestDTO {
  skuId: number;
  quantity: number;
}

export interface CheckoutRequestDTO {
  addressId: number;
  items: {
    skuId: number;
    quantity: number;
  }[];
}

export interface CheckoutResponseDTO {
  id: number;
  status: string;
  totalAmount: number;
  shippingFee: number;
  clientSecret: string;
  shippingAddress: any;
  expiresAt: string;
  items: any[];
}

// --- Orders ---

export interface OrderItemResponseDTO {
  id: number;
  skuId: number;
  productName: string;
  skuCode: string;
  size: string;
  color: string;
  imageUrl: string;
  priceAtPurchase: number;
  quantity: number;
}

export interface OrderResponseDTO {
  id: number;
  status: string;
  totalAmount: number;
  shippingFee: number;
  createdAt: string;
  shippingAddress: AddressResponseDTO;
  items: OrderItemResponseDTO[];
  clientSecret?: string; // Included when status is PENDING_PAYMENT
}

// --- Cart ---

export interface CartItemRequestDTO {
  skuId: number;
  quantity: number;
}

export interface CartItemResponseDTO {
  id: number;
  skuId: number;
  skuCode: string;
  size: string;
  productId: number;
  productName: string;
  productSlug: string;
  colorName: string;
  coverImageUrl: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  stockQuantity: number;
  available: boolean;
}

export interface CartResponseDTO {
  id: number;
  items: CartItemResponseDTO[];
  totalItems: number;
  totalPrice: number;
}
