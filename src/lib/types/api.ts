import type { OrderStatus } from './admin';

export const CATEGORIES = [
  'JACKETS',
  'COATS_AND_TRENCHES',
  'DRESSES',
  'BLAZERS',
  'SHIRTS_AND_BLOUSES',
  'JEANS',
  'T_SHIRTS',
  'SHIRTS',
  'SKIRTS_AND_SHORTS',
  'SHORTS',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const TARGET_AUDIENCES = ['MEN', 'WOMEN'] as const;

export type TargetAudience = (typeof TARGET_AUDIENCES)[number];

export const MATERIALS = [
  'COTTON',
  'LINEN',
  'WOOL',
  'SILK',
  'CASHMERE',
  'LEATHER',
  'VISCOSE',
  'MODAL',
  'LYOCELL',
  'POLYESTER',
  'POLYAMIDE',
  'ELASTANE',
  'ACRYLIC',
  'POLYURETHANE',
] as const;

export type Material = (typeof MATERIALS)[number];

export interface MaterialOption {
  name: Material;
  label: string;
}

export const CARE_AXES = [
  'WASH',
  'BLEACH',
  'TUMBLE_DRY',
  'NATURAL_DRY',
  'IRON',
  'PROFESSIONAL',
] as const;

export type CareAxis = (typeof CARE_AXES)[number];

export const CARE_INSTRUCTIONS = [
  'MACHINE_WASH_COLD',
  'MACHINE_WASH_WARM',
  'HAND_WASH',
  'DO_NOT_WASH',
  'NON_CHLORINE_BLEACH',
  'DO_NOT_BLEACH',
  'TUMBLE_DRY_LOW',
  'DO_NOT_TUMBLE_DRY',
  'LINE_DRY',
  'DRY_FLAT',
  'DRY_IN_SHADE',
  'IRON_LOW',
  'IRON_MEDIUM',
  'DO_NOT_IRON',
  'DRY_CLEAN',
  'DO_NOT_DRY_CLEAN',
] as const;

export type CareInstruction = (typeof CARE_INSTRUCTIONS)[number];

export interface CareInstructionDetail {
  instruction: CareInstruction;
  label: string;
  axis: CareAxis;
}

export interface CareAxisOptions {
  axis: CareAxis;
  label: string;
  options: { name: CareInstruction; label: string }[];
}

export const DISPLAY_POSITIONS = [
  'HOME_MAIN',
  'HOME_SECONDARY',
  'HEADER',
  'NEW_ARRIVALS',
  'FEATURED',
  'NONE',
] as const;

export type DisplayPosition = (typeof DISPLAY_POSITIONS)[number];

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
    material: Material;
    label: string;
    percentage: number;
  }[];
  careInstructions: CareInstructionDetail[];
  price: number;
  promotionalPrice: number | null;
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
  promotionalPrice: number | null;
  coverImageUrl: string;
  hoverImageUrl: string;
  colorsHex: string[];
}

export interface PageMetadata {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  page: PageMetadata;
}

export interface CollectionResponseDTO {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  heroImageUrl: string | null;
  portraitImageUrl: string | null;
  squareImageUrl: string | null;
  displayPosition: DisplayPosition;
  displayOrder: number | null;
  targetAudience: TargetAudience;
}

export function pickCollectionImage(
  collection: Pick<CollectionResponseDTO, 'heroImageUrl' | 'portraitImageUrl' | 'squareImageUrl'>,
  order: readonly ['heroImageUrl' | 'portraitImageUrl' | 'squareImageUrl', ...('heroImageUrl' | 'portraitImageUrl' | 'squareImageUrl')[]],
): string | null {
  for (const key of order) {
    const url = collection[key];
    if (url) return url;
  }
  return null;
}

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

export interface VerifyEmailRequestDTO {
  token: string;
}

export type Role = 'CUSTOMER' | 'ADMIN' | 'ADMIN_VIEWER';

export interface UserResponseDTO {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: Role;
}

export interface ApiErrorResponse {
  status: number;
  type?: string;
  title?: string;
  detail?: string;
  instance?: string;
  fields?: Record<string, string>;
}

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

export interface OrderItemResponseDTO {
  id: number;
  skuId: number;
  productName: string;
  skuCode: string;
  size: string;
  color: string;
  imageUrl: string;
  priceAtPurchase: number;
  listPriceAtPurchase: number;
  quantity: number;
}

export interface OrderResponseDTO {
  id: number;
  status: OrderStatus;
  totalAmount: number;
  shippingFee: number;
  createdAt: string;
  shippingAddress: AddressResponseDTO;
  items: OrderItemResponseDTO[];
  clientSecret?: string;
}

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
