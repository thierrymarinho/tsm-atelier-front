import type { MetadataRoute } from 'next';
import { serverEnv } from '@/lib/env';

// Tudo que fica atrás da sessão, mais as páginas rasas que só diluiriam o
// índice. `/search` entra porque o conteúdo dela é uma query string, não uma
// página que valha ranquear.
const PRIVATE_PATHS = [
  '/admin/',
  '/account/',
  '/checkout/',
  '/cart',
  '/search',
  '/verify-email',
];

export default function robots(): MetadataRoute.Robots {
  const environment = process.env.VERCEL_ENV;

  // A Vercel já manda `X-Robots-Tag: noindex` em preview; aqui a mesma intenção
  // fica escrita onde quem revisa o deploy consegue ver.
  if (environment && environment !== 'production') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  const base = serverEnv.SITE_URL;

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: PRIVATE_PATHS,
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
