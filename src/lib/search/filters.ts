import type { QueryParams } from "@/lib/api/client";
import {
  CATEGORIES,
  TARGET_AUDIENCES,
  type Category,
  type TargetAudience,
} from "@/lib/types/api";

export interface SearchFilters {
  q?: string;
  category?: Category;
  targetAudience?: TargetAudience;
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
  collectionId?: number;
  sort: string;
}

export const DEFAULT_SORT = "createdAt,desc";

export const SEARCH_PAGE_SIZE = 24;

export const SORT_OPTIONS = [
  { value: DEFAULT_SORT, label: "Mais recentes" },
  { value: "price,asc", label: "Menor preço" },
  { value: "price,desc", label: "Maior preço" },
  { value: "name,asc", label: "Nome (A-Z)" },
] as const;

const SORT_VALUES: ReadonlySet<string> = new Set(SORT_OPTIONS.map((option) => option.value));

const MAX_QUERY_LENGTH = 100;

function parseEnum<T extends string>(
  raw: string | null,
  allowed: readonly T[],
): T | undefined {
  if (!raw) return undefined;
  const candidate = raw.trim().toUpperCase();
  return (allowed as readonly string[]).includes(candidate) ? (candidate as T) : undefined;
}

function parsePrice(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === "") return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return undefined;
  return value;
}

function parseId(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === "") return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return undefined;
  return value;
}

export function parseSearchFilters(params: URLSearchParams): SearchFilters {
  const q = params.get("q")?.trim().slice(0, MAX_QUERY_LENGTH);

  const minPrice = parsePrice(params.get("minPrice"));
  let maxPrice = parsePrice(params.get("maxPrice"));

  if (minPrice !== undefined && maxPrice !== undefined && maxPrice < minPrice) {
    maxPrice = undefined;
  }

  const sort = params.get("sort");

  return {
    q: q || undefined,
    category: parseEnum(params.get("category"), CATEGORIES),
    targetAudience: parseEnum(params.get("targetAudience"), TARGET_AUDIENCES),
    minPrice,
    maxPrice,
    onSale: params.get("onSale") === "true" ? true : undefined,
    collectionId: parseId(params.get("collectionId")),
    sort: sort && SORT_VALUES.has(sort) ? sort : DEFAULT_SORT,
  };
}

export function toUrlSearchParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.targetAudience) params.set("targetAudience", filters.targetAudience);
  if (filters.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));
  if (filters.onSale) params.set("onSale", "true");
  if (filters.collectionId !== undefined) params.set("collectionId", String(filters.collectionId));
  if (filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);

  return params;
}

export function toApiParams(
  filters: SearchFilters,
  page: number,
  size: number,
): QueryParams {
  return {
    searchTerm: filters.q,
    category: filters.category,
    targetAudience: filters.targetAudience,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    onSale: filters.onSale,
    collectionId: filters.collectionId,
    sort: filters.sort,
    page,
    size,
  };
}

export function activeFilterCount(filters: SearchFilters): number {
  let count = 0;
  if (filters.category) count += 1;
  if (filters.targetAudience) count += 1;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count += 1;
  if (filters.onSale) count += 1;
  if (filters.collectionId !== undefined) count += 1;
  return count;
}

export function hasAnyFilter(filters: SearchFilters): boolean {
  return Boolean(filters.q) || activeFilterCount(filters) > 0;
}

export function emptyFilters(): SearchFilters {
  return { sort: DEFAULT_SORT };
}

const SECTION_EXCLUSIVE_CATEGORIES: Partial<Record<Category, TargetAudience>> = {
  DRESSES: "WOMEN",
  SHIRTS_AND_BLOUSES: "WOMEN",
  SKIRTS_AND_SHORTS: "WOMEN",
  BLAZERS: "MEN",
  SHIRTS: "MEN",
  SHORTS: "MEN",
};

export function isCategoryValidFor(
  category: Category,
  targetAudience: TargetAudience | undefined,
): boolean {
  if (!targetAudience) return true;
  const exclusiveTo = SECTION_EXCLUSIVE_CATEGORIES[category];
  return exclusiveTo === undefined || exclusiveTo === targetAudience;
}
