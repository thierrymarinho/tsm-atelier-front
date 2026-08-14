export const DEFAULT_THRESHOLD = 5;

export const MAX_THRESHOLD = 1000;
export const MIN_THRESHOLD = 0;

export interface StockFilters {
  q: string;
  threshold: number;
  page: number;
  open?: number;
}

export function clampThreshold(value: number): number {
  return Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, value));
}

export function parseThreshold(raw: string | null): number {
  if (raw === null || raw.trim() === '') return DEFAULT_THRESHOLD;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < MIN_THRESHOLD || value > MAX_THRESHOLD) {
    return DEFAULT_THRESHOLD;
  }
  return value;
}

export function parsePage(raw: string | null): number {
  if (raw === null || raw.trim() === '') return 0;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : 0;
}

export function parseProductId(raw: string | null): number | undefined {
  if (!raw?.trim()) return undefined;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

export function parseStockFilters(params: URLSearchParams): StockFilters {
  return {
    q: params.get('q')?.trim() ?? '',
    threshold: parseThreshold(params.get('threshold')),
    page: parsePage(params.get('page')),
    open: parseProductId(params.get('open')),
  };
}

export function toStockUrlParams(filters: StockFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.threshold !== DEFAULT_THRESHOLD) params.set('threshold', String(filters.threshold));
  if (filters.page !== 0) params.set('page', String(filters.page));
  if (filters.open !== undefined) params.set('open', String(filters.open));
  return params;
}

export function stockHref(product: { id: number; name: string }): string {
  const params = toStockUrlParams({
    q: product.name,
    threshold: DEFAULT_THRESHOLD,
    page: 0,
    open: product.id,
  });
  return `/admin/stock?${params.toString()}`;
}
