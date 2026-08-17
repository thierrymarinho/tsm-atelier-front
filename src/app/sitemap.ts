import type { MetadataRoute } from 'next';
import { getAllCollections, getAllProductSlugs, withCatalogFallback } from '@/lib/api/server';
import { serverEnv } from '@/lib/env';

const STATIC_ROUTES = [
  { path: '', changeFrequency: 'daily', priority: 1 },
  { path: '/catalog', changeFrequency: 'daily', priority: 0.9 },
  { path: '/sale', changeFrequency: 'daily', priority: 0.8 },
  { path: '/contact', changeFrequency: 'yearly', priority: 0.3 },
] as const satisfies readonly {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
  priority: number;
}[];

// Sem `lastModified` em lugar nenhum: a API do catálogo não expõe data de
// atualização, e um `new Date()` em build diria aos crawlers que toda página
// mudou a cada deploy. Ausente é honesto; errado faz desconfiarem do sitemap
// inteiro.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = serverEnv.SITE_URL;

  // Um sitemap só com as rotas estáticas é um sitemap ruim; um build que falha
  // porque o backend estava dormindo é pior.
  const [collections, productSlugs] = await Promise.all([
    withCatalogFallback(getAllCollections(), []),
    withCatalogFallback(getAllProductSlugs(), []),
  ]);

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${base}${route.path}`,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),

    ...collections
      .filter((collection) => collection.active)
      .map((collection) => ({
        url: `${base}/collections/${collection.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),

    ...productSlugs.map((slug) => ({
      url: `${base}/product/${slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];
}
