import { serverEnv } from '@/lib/env';
import { CATALOG_UNAVAILABLE_DIGEST } from '@/lib/catalog-unavailable';
import type {
  CollectionResponseDTO,
  DisplayPosition,
  PaginatedResponse,
  ProductResponseDTO,
  ProductSummaryDTO,
  TargetAudience,
} from '@/lib/types/api';

const CATALOG_REVALIDATE_SECONDS = 300;

// O Next derruba a geração de uma página estática em 60s. Um serviço do Render
// hibernando segura a conexão durante o spin-up, e `fetch` sem prazo fica
// pendurado até esse limite — foi exatamente o que reprovou o build na Vercel.
//
// No build o prazo é maior, para um backend lento mas vivo ainda responder.
// 25s, e não 45s, porque o sitemap pagina produtos em chamadas sequenciais:
// duas lentas somariam 50s e ainda cabem nos 60s. Com 45s, a segunda já
// estouraria o limite e reprovaria a página.
//
// Em runtime esperar tanto é inútil, porque a função da Vercel é encerrada
// antes disso. 10s faz o aviso de cold start aparecer rápido, e a retentativa
// do BackendUnavailableBanner assume daí em diante.
const CATALOG_TIMEOUT_MS =
  process.env.NEXT_PHASE === 'phase-production-build' ? 25_000 : 10_000;

export class CatalogUnavailableError extends Error {
  readonly digest = CATALOG_UNAVAILABLE_DIGEST;

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
    res = await fetch(url, {
      next: { revalidate, tags },
      signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS),
    });
  } catch (error) {
    // Separar os dois no log importa: "no response" é backend inalcançável,
    // "timed out" é backend que atendeu a conexão e não respondeu a tempo —
    // a assinatura de um serviço acordando.
    const detail = (error as Error)?.name === 'TimeoutError' ? 'timed out' : 'no response';
    throw new CatalogUnavailableError(`${path} — ${detail}`, { cause: error });
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

// O relançamento existe só para proteger o cache do ISR, que só existe no
// runtime de produção. No build e em desenvolvimento, degradar.
const PROTECTS_ISR_CACHE =
  process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build';

export async function withCatalogFallback<T>(operation: Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    if (!isCatalogUnavailable(error)) throw error;

    // No build, degradar: um backend hibernando não pode reprovar o deploy, e
    // não existe cópia anterior para preservar. Em desenvolvimento também, para
    // trabalhar no front sem o backend de pé continuar possível.
    //
    // No runtime de produção, relançar. Engolir aqui faz a renderização "dar certo" com
    // dados vazios, e o Next grava essa página vazia por cima da boa, por
    // CATALOG_REVALIDATE_SECONDS inteiros. Lançando, a documentação do ISR
    // garante o oposto: "the last successfully generated data will continue to
    // be served from the cache. On the next subsequent request, Next.js will
    // retry revalidating the data" — a cópia boa continua no ar e a próxima
    // visita já tenta de novo, em vez de esperar a janela fechar.
    if (PROTECTS_ISR_CACHE) throw error;

    // `warn`, e não `error`: a condição está tratada — existe fallback e a
    // página renderiza. Nível de erro fica para o que ninguém pegou. Em
    // desenvolvimento isso também tira a linha do overlay do Next, que só
    // reage a `console.error`; a home faz três buscas em paralelo, então uma
    // queda do backend abria três diálogos para um único fato.
    console.warn(`[catalog] ${(error as Error).message}`);
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

const SITEMAP_PAGE_SIZE = 100;
const SITEMAP_MAX_PAGES = 50;

export async function getAllCollections(): Promise<CollectionResponseDTO[]> {
  const data = await catalogFetch<CollectionResponseDTO[]>('/v1/catalog/collections', {
    tags: ['collections'],
  });
  return Array.isArray(data) ? data : [];
}

export async function getAllProductSlugs(): Promise<string[]> {
  const slugs: string[] = [];

  for (let page = 0; page < SITEMAP_MAX_PAGES; page += 1) {
    const data = await catalogFetch<PaginatedResponse<ProductSummaryDTO>>(
      `/v1/catalog/products${buildQuery({ page, size: SITEMAP_PAGE_SIZE, sort: 'createdAt,desc' })}`,
      { tags: ['products'] },
    );

    if (!data?.content?.length) break;

    slugs.push(...data.content.map((product) => product.slug));

    const totalPages = data.page?.totalPages ?? 1;
    if (page + 1 >= totalPages) break;

    // O laço é limitado para que um bug de paginação não trave o build. Depois
    // do teto o sitemap sairia curto em silêncio, então avisa no log.
    if (page + 1 === SITEMAP_MAX_PAGES) {
      console.warn(
        `[catalog] sitemap capped at ${SITEMAP_MAX_PAGES * SITEMAP_PAGE_SIZE} products ` +
          `(${totalPages} pages available) — raise SITEMAP_MAX_PAGES.`,
      );
    }
  }

  return slugs;
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
