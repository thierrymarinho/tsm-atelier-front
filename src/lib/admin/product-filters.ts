import type { QueryParams } from '@/lib/api/client';
import { CATEGORIES, TARGET_AUDIENCES, type Category, type TargetAudience } from '@/lib/types/api';

export interface ProductFilters {
  q?: string;
  category?: Category;
  targetAudience?: TargetAudience;
  collectionId?: number;
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean;
  onSale?: boolean;
  sort: string;
  page: number;
}

export const DEFAULT_PRODUCT_SORT = 'createdAt,desc';

export const PRODUCTS_PAGE_SIZE = 20;

export const PRODUCT_SORT_OPTIONS = [
  { value: DEFAULT_PRODUCT_SORT, label: 'Mais recentes' },
  { value: 'createdAt,asc', label: 'Mais antigos' },
  { value: 'name,asc', label: 'Nome (A-Z)' },
  { value: 'name,desc', label: 'Nome (Z-A)' },
  { value: 'price,desc', label: 'Maior preço de tabela' },
  { value: 'price,asc', label: 'Menor preço de tabela' },
] as const;

const SORT_VALUES: ReadonlySet<string> = new Set(PRODUCT_SORT_OPTIONS.map((o) => o.value));

const MAX_QUERY_LENGTH = 100;

function parsePositiveInt(raw: string | null): number | undefined {
  if (!raw?.trim()) return undefined;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function parsePrice(raw: string | null): number | undefined {
  if (!raw?.trim()) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function parseBoolean(raw: string | null): boolean | undefined {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return undefined;
}

export function parseProductFilters(params: URLSearchParams): ProductFilters {
  const q = params.get('q')?.trim().slice(0, MAX_QUERY_LENGTH) || undefined;

  const rawCategory = params.get('category')?.trim().toUpperCase();
  const category = (CATEGORIES as readonly string[]).includes(rawCategory ?? '')
    ? (rawCategory as Category)
    : undefined;

  const rawAudience = params.get('targetAudience')?.trim().toUpperCase();
  const targetAudience = (TARGET_AUDIENCES as readonly string[]).includes(rawAudience ?? '')
    ? (rawAudience as TargetAudience)
    : undefined;

  const collectionId = parsePositiveInt(params.get('collectionId'));

  const minPrice = parsePrice(params.get('minPrice'));
  let maxPrice = parsePrice(params.get('maxPrice'));

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) maxPrice = undefined;

  const rawSort = params.get('sort');
  const sort = rawSort && SORT_VALUES.has(rawSort) ? rawSort : DEFAULT_PRODUCT_SORT;

  const rawPage = Number(params.get('page'));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 0;

  return {
    q,
    category,
    targetAudience,
    collectionId,
    minPrice,
    maxPrice,
    isFeatured: parseBoolean(params.get('isFeatured')),
    onSale: parseBoolean(params.get('onSale')),
    sort,
    page,
  };
}

export function toProductUrlParams(filters: ProductFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.category) params.set('category', filters.category);
  if (filters.targetAudience) params.set('targetAudience', filters.targetAudience);
  if (filters.collectionId !== undefined) params.set('collectionId', String(filters.collectionId));
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.isFeatured !== undefined) params.set('isFeatured', String(filters.isFeatured));
  if (filters.onSale !== undefined) params.set('onSale', String(filters.onSale));
  if (filters.sort !== DEFAULT_PRODUCT_SORT) params.set('sort', filters.sort);
  if (filters.page > 0) params.set('page', String(filters.page));
  return params;
}

export function toProductApiParams(filters: ProductFilters): QueryParams {
  return {
    searchTerm: filters.q,
    category: filters.category,
    targetAudience: filters.targetAudience,
    collectionId: filters.collectionId,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    isFeatured: filters.isFeatured,
    onSale: filters.onSale,
    sort: filters.sort,
    page: filters.page,
    size: PRODUCTS_PAGE_SIZE,
  };
}

export function activeProductFilterCount(filters: ProductFilters): number {
  return [
    filters.q,
    filters.category,
    filters.targetAudience,
    filters.collectionId,
    filters.minPrice,
    filters.maxPrice,
    filters.isFeatured,
    filters.onSale,
  ].filter((value) => value !== undefined).length;
}
