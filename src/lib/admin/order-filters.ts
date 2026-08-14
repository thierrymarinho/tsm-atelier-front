import type { QueryParams } from "@/lib/api/client";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types/admin";

export interface OrderFilters {
  status?: OrderStatus;
  q?: string;
  createdFrom?: string;
  createdTo?: string;
  sort: string;
  page: number;
}

export const DEFAULT_ORDER_SORT = "createdAt,desc";

export const ORDERS_PAGE_SIZE = 20;

export const ORDER_SORT_OPTIONS = [
  { value: DEFAULT_ORDER_SORT, label: "Mais recentes" },
  { value: "createdAt,asc", label: "Mais antigos" },
  { value: "totalAmount,desc", label: "Maior valor" },
  { value: "totalAmount,asc", label: "Menor valor" },
  { value: "id,desc", label: "Nº do pedido (maior)" },
  { value: "id,asc", label: "Nº do pedido (menor)" },
  { value: "status,asc", label: "Status (A-Z)" },
] as const;

const SORT_VALUES: ReadonlySet<string> = new Set(ORDER_SORT_OPTIONS.map((o) => o.value));

const MAX_QUERY_LENGTH = 100;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(raw: string | null): string | undefined {
  if (!raw || !ISO_DATE.test(raw)) return undefined;
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10) === raw ? raw : undefined;
}

export function parseOrderFilters(params: URLSearchParams): OrderFilters {
  const rawStatus = params.get("status")?.trim().toUpperCase();
  const status = (ORDER_STATUSES as readonly string[]).includes(rawStatus ?? "")
    ? (rawStatus as OrderStatus)
    : undefined;

  const q = params.get("q")?.trim().slice(0, MAX_QUERY_LENGTH) || undefined;

  const createdFrom = parseIsoDate(params.get("createdFrom"));
  let createdTo = parseIsoDate(params.get("createdTo"));

  if (createdFrom && createdTo && createdFrom > createdTo) createdTo = undefined;

  const rawSort = params.get("sort");
  const sort = rawSort && SORT_VALUES.has(rawSort) ? rawSort : DEFAULT_ORDER_SORT;

  const rawPage = Number(params.get("page"));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 0;

  return { status, q, createdFrom, createdTo, sort, page };
}

export function toUrlSearchParams(filters: OrderFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.q) params.set("q", filters.q);
  if (filters.createdFrom) params.set("createdFrom", filters.createdFrom);
  if (filters.createdTo) params.set("createdTo", filters.createdTo);
  if (filters.sort !== DEFAULT_ORDER_SORT) params.set("sort", filters.sort);
  if (filters.page > 0) params.set("page", String(filters.page));
  return params;
}

export function toApiParams(filters: OrderFilters): QueryParams {
  return {
    status: filters.status,
    searchTerm: filters.q,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
    sort: filters.sort,
    page: filters.page,
    size: ORDERS_PAGE_SIZE,
  };
}

export function activeOrderFilterCount(filters: OrderFilters): number {
  return [filters.status, filters.q, filters.createdFrom, filters.createdTo].filter(Boolean).length;
}
