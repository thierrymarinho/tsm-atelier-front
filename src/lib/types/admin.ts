import type {
  CareInstruction,
  CareInstructionDetail,
  Category,
  DisplayPosition,
  Material,
  TargetAudience,
} from './api';

export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAYMENT_FAILED',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type ProductSize = 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XG';

export const STOCK_CHANGE_REASONS = [
  'RESTOCK',
  'INVENTORY_COUNT',
  'RETURN',
  'DAMAGE',
  'LOSS',
  'CORRECTION',
] as const;

export type StockChangeReason = (typeof STOCK_CHANGE_REASONS)[number];

export interface LowStockSku {
  skuId: number;
  skuCode: string;
  productId: number;
  productName: string;
  colorName: string;
  size: ProductSize;
  stockQuantity: number;
  version: number;
}

export interface Revenue {
  today: number;
  last7Days: number;
  last30Days: number;
}

export interface DashboardResponse {
  ordersByStatus: Record<OrderStatus, number>;
  revenue: Revenue;
  lowStock: LowStockSku[];
  lowStockCount: number;
  lowStockPageSize: number;
  lowStockPage: number;
}

export type StockAdjustment =
  | { delta: number; reason: StockChangeReason }
  | { absolute: number; version: number; reason: StockChangeReason };

export interface StockResponse {
  skuId: number;
  skuCode: string;
  stockQuantity: number;
  version: number;
}

export interface AdminProductSku {
  id: number;
  version: number;
  size: ProductSize;
  skuCode: string;
  stockQuantity: number;
  deletedAt: string | null;
}

export interface AdminProductColor {
  id: number;
  colorName: string;
  colorHex: string;
  coverImageUrl: string | null;
  hoverImageUrl: string | null;
  galleryImages: string[];
  skus: AdminProductSku[];
  deletedAt: string | null;
}

export interface AdminProductResponse {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  fabricCompositions: FabricComposition[];
  careInstructions: CareInstructionDetail[];
  price: number;
  promotionalPrice: number | null;
  collection: AdminCollectionResponse | null;
  category: Category;
  targetAudience: TargetAudience;
  active: boolean;
  featured: boolean;
  colors: AdminProductColor[];
  deletedAt: string | null;
}

export interface FabricComposition {
  material: Material;
  label: string;
  percentage: number;
}

export interface FabricCompositionRequest {
  material: Material;
  percentage: number;
}

export interface ProductSkuRequest {
  id?: number;
  size: ProductSize;
  stockQuantity?: number;
}

export interface ProductColorRequest {
  id?: number;
  colorName: string;
  colorHex: string;
  coverImageUrl?: string;
  hoverImageUrl?: string;
  galleryImages?: string[];
  skus: ProductSkuRequest[];
}

export interface ProductRequest {
  name: string;
  description?: string;
  fabricCompositions?: FabricCompositionRequest[];
  careInstructions?: CareInstruction[];
  price: number;
  promotionalPrice?: number;
  collectionId?: number;
  category: Category;
  targetAudience: TargetAudience;
  active: boolean;
  featured: boolean;
  colors: ProductColorRequest[];
}

export interface AdminProductSummary {
  id: number;
  name: string;
  slug: string;
  price: number;
  promotionalPrice: number | null;
  featured: boolean;
  coverImageUrl: string | null;
  hoverImageUrl: string | null;
  colorsHex: string[];
  deletedAt: string | null;
  active: boolean;
}

export interface AdminCollectionResponse {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  heroImageUrl: string | null;
  portraitImageUrl: string | null;
  squareImageUrl: string | null;
  displayPosition: DisplayPosition | null;
  displayOrder: number | null;
  targetAudience: TargetAudience;
}

export interface CollectionRequest {
  name: string;
  active: boolean;
  description?: string;
  heroImageUrl?: string;
  portraitImageUrl?: string;
  squareImageUrl?: string;
  displayPosition?: DisplayPosition;
  displayOrder?: number;
  targetAudience: TargetAudience;
}

export interface AdminShippingAddress {
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface AdminOrderItem {
  id: number;
  skuId: number | null;
  productName: string;
  skuCode: string;
  size: string;
  color: string;
  imageUrl: string;
  priceAtPurchase: number;
  listPriceAtPurchase: number;
  quantity: number;
}

export interface AdminOrderResponse {
  id: number;
  status: OrderStatus;
  totalAmount: number;
  shippingFee: number;
  customerId: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: AdminShippingAddress;
  expiresAt: string | null;
  createdAt: string;
  items: AdminOrderItem[];
}

export const AUDITED_ENTITIES = ['PRODUCT', 'PRODUCT_SKU', 'COLLECTION', 'ORDER'] as const;

export type AuditedEntity = (typeof AUDITED_ENTITIES)[number];

export const AUDIT_ACTIONS = [
  'CREATED',
  'UPDATED',
  'DELETED',
  'RESTORED',
  'STATUS_CHANGED',
  'STOCK_ADJUSTED',
  'PROMOTIONAL_PRICE_CHANGED',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditLogResponse {
  id: number;
  actor: string;
  entityType: AuditedEntity;
  entityId: string;
  action: AuditAction;
  previousValue: string | null;
  newValue: string | null;
  reason: StockChangeReason | null;
  details: string | null;
  createdAt: string;
}

export interface AdminProblemDetail {
  status: number;
  type?: string;
  title?: string;
  detail?: string;
  instance?: string;
  fields?: Record<string, string>;
  from?: OrderStatus;
  to?: OrderStatus;
  availableQuantity?: number;
}
