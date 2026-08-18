# TSM Atelier — Loja (front-end)

Vitrine e painel administrativo da **[API TSM Atelier](https://github.com/thierrymarinho/tsm-atelier)**:
um e-commerce de moda em Next.js que consome a API por rewrite de mesma origem, renderiza o
catálogo no servidor e trata o backend fora do ar como um estado previsto, não como acidente.

![Next.js](https://img.shields.io/badge/Next.js-16.2-black)
![React](https://img.shields.io/badge/React-19.2-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38BDF8)

**▶ [Ver rodando](https://tsm-atelier-front.vercel.app/)** — front na Vercel, API no Render.
Tudo em plano gratuito: o backend hiberna após 15 minutos sem tráfego, então se a primeira tela
demorar, é a API acordando (~1 min). A loja mostra o aviso em vez de fingir que o catálogo está
vazio.

---

## ⚠️ O projeto principal é o backend

Este repositório é a **camada de apresentação**. Toda a regra de negócio — autenticação por
cookie, controle de estoque sob concorrência, checkout com reserva, pagamento Stripe, trilha de
auditoria — vive na API:

### **→ [github.com/thierrymarinho/tsm-atelier](https://github.com/thierrymarinho/tsm-atelier)**

É lá que estão as decisões técnicas que valem a leitura, o desenho da arquitetura, os testes de
integração e a referência dos 50 endpoints. Se você chegou aqui pelo portfólio, **comece por lá**;
volte a este repositório para ver como a API é consumida por um cliente real.

| Documento | Onde | O que cobre |
|---|---|---|
| Repositório da API | [thierrymarinho/tsm-atelier](https://github.com/thierrymarinho/tsm-atelier) | Arquitetura, decisões técnicas, stack, testes |
| `API_REFERENCE.md` | [na API](https://github.com/thierrymarinho/tsm-atelier/blob/main/API_REFERENCE.md) | Contrato dos endpoints |
| `DEPLOY.md` | [aqui](DEPLOY.md) | Publicar as duas metades (Vercel, Render, Neon, Upstash, Stripe) |

---

## Sumário

- [O que esta aplicação faz](#o-que-esta-aplicação-faz)
- [Stack](#stack)
- [Como rodar](#como-rodar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Arquitetura](#arquitetura)
- [Decisões técnicas](#decisões-técnicas)
- [Deploy](#deploy)

---

## O que esta aplicação faz

**Loja** — home com coleções em destaque e lançamentos, catálogo com filtros, busca com
autocomplete e facetas, página de produto com galeria por cor e grade de tamanhos, carrinho,
checkout com endereço e pagamento Stripe, conta com pedidos e endereços.

**Painel** (`/admin`, apenas `ROLE_ADMIN`) — produtos com cores, SKUs e upload de imagem;
coleções que alimentam a vitrine; ajuste de estoque por movimento ou contagem física; pedidos com
mudança de status; histórico de alterações.

| Rota | Renderização |
|---|---|
| `/` | Servidor, com revalidação — vitrine e lançamentos |
| `/catalog`, `/sale`, `/collections/[slug]` | Servidor, filtros no cliente |
| `/product/[slug]` | Servidor, `generateMetadata` por produto |
| `/search` | Casca no servidor, resultados no cliente — dependem do que o usuário digita |
| `/cart` | Cliente — o carrinho do visitante mora no navegador |
| `/checkout`, `/account` | Cliente, atrás de sessão |
| `/admin/**` | Cliente, atrás de `ROLE_ADMIN` |
| `/sitemap.xml`, `/robots.txt` | Gerados da API, em `src/app/sitemap.ts` e `robots.ts` |

---

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | Next.js 16 (App Router) · React 19 | Server Components para o catálogo, Client Components só onde há interação |
| Compilador | React Compiler | Memoização automática — sem `useMemo`/`useCallback` espalhados pela UI |
| Linguagem | TypeScript `strict` | Os DTOs da API estão tipados em `src/lib/types/api.ts` e são a fronteira do sistema |
| Estilo | Tailwind CSS 4 · `next/font` (Inter, Playfair) | Fontes auto-hospedadas, sem requisição a terceiros nem layout shift |
| Dados dinâmicos | TanStack Query 5 | Cache, `staleTime` e refetch para busca, painel e carrinho |
| Pagamento | Stripe Elements | O `clientSecret` vem da API; a chave secreta nunca chega ao navegador |
| Imagens | `next/image` com loader Cloudinary | Transformação na URL, sem passar pela otimização da Vercel |
| Deploy | Vercel | Rewrite `/api/:path*` para o Render, revalidação por tag e sitemap gerado da API |

---

## Como rodar

**Pré-requisitos:** Node 24 (fixado em `engines`) e a [API](https://github.com/thierrymarinho/tsm-atelier)
rodando — sem ela sobe a casca, mas nada de catálogo, sessão ou carrinho.

```bash
npm install
cp .env.example .env.local     # aponte SPRING_BOOT_API_URL para a API
npm run dev                    # http://localhost:3000
```

```bash
npm run build && npm start     # build de produção
npm run lint
npx tsc --noEmit
```

Para subir a API localmente, siga as instruções do
[repositório do backend](https://github.com/thierrymarinho/tsm-atelier) — o `docker-compose.yml`
de lá sobe Postgres e Redis, e o Gradle vem pelo wrapper.

---

## Variáveis de ambiente

`.env.example` traz as três, comentadas. O resumo:

| Variável | Obrigatória | O que é |
|---|---|---|
| `SPRING_BOOT_API_URL` | sim | Origem da API. **Sem barra no fim** — sobra vira `//api/...`, que o Spring Security recusa com `400` |
| `SITE_URL` | não | Origem pública da loja, para `metadataBase`, sitemap e robots. Na Vercel cai em `VERCEL_PROJECT_PRODUCTION_URL` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | para pagar | Chave publicável (`pk_...`). A secreta pertence ao backend |

**Não existe variável para a URL da API no navegador**, de propósito: ela é fixa no caminho
relativo `/api`. O porquê está na próxima seção.

---

## Arquitetura

```
                        ┌─────────────────────────────┐
   navegador  ─────────→│  Next.js (Vercel)           │
                        │                             │
                        │  Server Components ──┐      │
                        │  /api/:path*  ───────┼──┐   │
                        └──────────────────────┼──┼───┘
                                               │  │  rewrite
                        ┌──────────────────────▼──▼───┐
                        │  Spring Boot (Render)       │
                        │  Postgres · Redis · Stripe  │
                        └─────────────────────────────┘
```

O navegador **nunca fala com o Render**. Ele chama `/api/v1/...` no próprio domínio, e o rewrite
declarado em `next.config.ts` repassa. Os Server Components pulam o rewrite e chamam a API
direto, porque já estão do lado servidor.

```
src/
├── app/
│   ├── (storefront)/   loja — o grupo carrega header, footer e providers
│   └── admin/          painel, atrás de ROLE_ADMIN
├── components/
│   ├── domain/         catálogo e produto, reaproveitados entre rotas
│   ├── admin/ auth/ cart/ checkout/ home/ layout/ search/
│   └── providers/      QueryClient, sessão, carrinho, toasts
└── lib/
    ├── api/
    │   ├── server.ts   catálogo nos Server Components (cache + tags)
    │   ├── client.ts   cliente do navegador (CSRF, refresh, timeout)
    │   └── revalidate.ts  Server Actions que invalidam as tags
    ├── context/        sessão, carrinho, painel de login, toasts
    ├── types/api.ts    DTOs da API
    └── env.ts          leitura das variáveis, com erro explícito se faltar
```

---

## Decisões técnicas

### 1. Mesma origem por rewrite — e nenhum CORS

Os cookies da API são `HttpOnly`, `Secure`, `SameSite=Strict`, com prefixo `__Host-`/`__Secure-`.
`SameSite=Strict` **só envia o cookie na mesma origem**: apontar o navegador direto para o Render
faria o catálogo público continuar funcionando e **toda ação autenticada falhar** — a pior forma
de quebrar, porque a loja parece saudável. O rewrite resolve isso sem uma linha de CORS.

Corolário: o front nunca lê token, nunca guarda nada em `localStorage` e nunca manda
`Authorization: Bearer`. A sessão é do navegador, não do JavaScript.

### 2. Catálogo no servidor, com revalidação por tag

`src/lib/api/server.ts` busca com `next: { revalidate: 300, tags }`. O HTML já sai com produto
dentro — bom para LCP e para o crawler. Quando o painel salva um produto, uma Server Action chama
`updateTag('products')` e a vitrine se atualiza sem esperar os 5 minutos.

### 3. TanStack Query só onde os dados mudam

Nada de `useQuery` para o que o servidor já entregou pronto. Ele cobre o que é sabidamente
volátil: busca, filtros, listagens do painel, estoque, pedidos.

### 4. Falha do backend é um estado da UI

`catalogFetch` distingue **"a API respondeu que não existe"** (`404` → `notFound()`) de **"a API
não respondeu"** (`CatalogUnavailableError`). Só o segundo vira `ColdStartNotice`, a tela que
explica a hibernação do plano gratuito e tenta de novo. Sem essa distinção, uma piscada do backend
transformaria produto real em 404 — e o Google indexaria isso.

Onde a página tem conteúdo suficiente sem a chamada, `withCatalogFallback` degrada em vez de
derrubar: a home renderiza mesmo com uma das três buscas falhando.

### 5. Carrinho: visitante no navegador, sessão no servidor

Sem login, o carrinho vive no `localStorage` e a loja funciona inteira. Com login, a autoridade
passa a ser `/v1/cart` — o backend é quem sabe se o SKU ainda tem estoque.

---

## Deploy

O passo a passo completo — Neon, Upstash, Cloudinary, Resend, Stripe, Render e Vercel, na ordem
que desfaz a dependência circular entre front e backend — está em **[DEPLOY.md](DEPLOY.md)**,
junto das armadilhas do plano gratuito.

---

> **Projeto de portfólio, não um produto.** Roda de ponta a ponta, mas existe para estudar as
> decisões — e as que mais importam estão do lado da
> **[API](https://github.com/thierrymarinho/tsm-atelier)**.
