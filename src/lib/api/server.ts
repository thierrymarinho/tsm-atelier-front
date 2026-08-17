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

export class CatalogUnavailableError extends Error {
  constructor(detail: string, options?: { cause?: unknown }) {
    super(`catalog backend unavailable: ${detail}`, options);
    this.name = 'CatalogUnavailableError';
  }
}

export function isCatalogUnavailable(error: unknown): boolean {
  return error instanceof CatalogUnavailableError || (error as Error)?.name === 'CatalogUnavailableError';
}

// `null` significa que o backend respondeu e disse que o recurso não existe.
// Todo o resto lança, porque quem chama transforma `null` em notFound() —
// juntar os dois faz um produto real responder 404 a cada piscada do backend.
async function catalogFetch<T>(
  path: string,
  { tags, revalidate = CATALOG_REVALIDATE_SECONDS }: { tags: string[]; revalidate?: number },
): Promise<T | null> {
  const url = `${serverEnv.API_URL}/api${path}`;

  let res: Response;
  try {
    res = await fetch(url, { next: { revalidate, tags } });
  } catch (error) {
    throw new CatalogUnavailableError(`${path} — no response`, { cause: error });
  }

  if (res.status === 404) return null;

  if (!res.ok) {
    throw new CatalogUnavailableError(`${path} — HTTP ${res.status}`);
  }

  try {
    return (await res.json()) as T;
  } catch (error) {
    // Um serviço do Render em spin-up responde com a página HTML de
    // carregamento dele. Um corpo que não parseia significa backend ainda
    // ausente, não recurso inexistente.
    throw new CatalogUnavailableError(`${path} — body is not JSON`, { cause: error });
  }
}

export async function withCatalogFallback<T>(operation: Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    if (!isCatalogUnavailable(error)) throw error;
    console.error(`[catalog] ${(error as Error).message}`);
    return fallback;
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
}): Promise<ProductSummaryDTO[]> {
  const data = await catalogFetch<PaginatedResponse<ProductSummaryDTO>>(
    `/v1/catalog/products${buildQuery({ ...params, sort: params.sort ?? 'createdAt,desc' })}`,
    { tags: ['products'] },
  );
  return data?.content ?? [];
}
