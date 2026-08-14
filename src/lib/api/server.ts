import { serverEnv } from '@/lib/env';
import type {
  CollectionResponseDTO,
  DisplayPosition,
  PaginatedResponse,
  ProductResponseDTO,
  ProductSummaryDTO,
  TargetAudience,
} from '@/lib/types/api';

const CATALOG_REVALIDATE_SECONDS = 300;

async function catalogFetch<T>(
  path: string,
  { tags, revalidate = CATALOG_REVALIDATE_SECONDS }: { tags: string[]; revalidate?: number },
): Promise<T | null> {
  const url = `${serverEnv.API_URL}/api${path}`;

  try {
    const res = await fetch(url, { next: { revalidate, tags } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (error) {
    console.error(`[catalog] request failed: ${path}`, error);
    return null;
  }
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function getCollectionsByPosition(
  position: DisplayPosition,
  targetAudience?: TargetAudience,
): Promise<CollectionResponseDTO[]> {
  const data = await catalogFetch<CollectionResponseDTO[]>(
    `/v1/catalog/collections${buildQuery({ position, targetAudience })}`,
    { tags: ['collections', `collections:${position}`] },
  );
  return Array.isArray(data) ? data : [];
}

export async function getCollectionByPosition(
  position: DisplayPosition,
  targetAudience?: TargetAudience,
): Promise<CollectionResponseDTO | null> {
  const collections = await getCollectionsByPosition(position, targetAudience);
  return collections[0] ?? null;
}

export async function getCollectionBySlug(slug: string): Promise<CollectionResponseDTO | null> {
  return catalogFetch<CollectionResponseDTO>(
    `/v1/catalog/collections/slug/${encodeURIComponent(slug)}`,
    { tags: ['collections', `collection:${slug}`] },
  );
}

export async function getProductBySlug(slug: string): Promise<ProductResponseDTO | null> {
  return catalogFetch<ProductResponseDTO>(
    `/v1/catalog/products/slug/${encodeURIComponent(slug)}`,
    { tags: ['products', `product:${slug}`] },
  );
}

export async function getProducts(params: {
  targetAudience?: TargetAudience;
  category?: string;
  collectionId?: number;
  onSale?: boolean;
  sort?: string;
  size?: number;
}): Promise<ProductSummaryDTO[] | null> {
  const data = await catalogFetch<PaginatedResponse<ProductSummaryDTO>>(
    `/v1/catalog/products${buildQuery({ ...params, sort: params.sort ?? 'createdAt,desc' })}`,
    { tags: ['products'] },
  );
  if (data === null) return null;
  return data.content ?? [];
}
