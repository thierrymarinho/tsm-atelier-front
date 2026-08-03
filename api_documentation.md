# TSM Atelier - API Documentation

Bem-vindo à documentação da API do TSM Atelier. Esta API foi construída com Spring Boot e serve como backend para o e-commerce.

---

## 🔐 Autenticação e Fluxo de Login

A API utiliza um sistema robusto de autenticação baseado em **Cookies HTTP-Only**, eliminando a necessidade de o frontend gerenciar tokens sensíveis (como `access_token` ou `refresh_token`) no `localStorage` ou `sessionStorage`.

### Como o Fluxo Funciona (Frontend)
1. **Login/Registro:** O frontend envia as credenciais para o endpoint `/api/v1/auth/login` (ou `register`).
2. **Cookies Automáticos:** Se as credenciais forem válidas, a API retornará uma resposta `200 OK` (ou `201 Created`) com dois cookies embutidos nos headers da resposta:
   - `access_token`: Token de curto prazo (válido em todas as rotas).
   - `refresh_token`: Token de longo prazo (válido apenas na rota `/refresh`).
3. **Requisições Autenticadas:** O frontend **não precisa extrair o token**. Como os cookies são enviados pelo navegador, toda requisição subsequente para a API (no mesmo domínio) já incluirá o cookie automaticamente se `credentials: 'include'` for configurado no `fetch` ou no `axios`.
4. **Renovação (Refresh):** Quando o `access_token` expirar (API retornará HTTP 401), o frontend deve fazer um POST para `/api/v1/auth/refresh`. A API lerá o `refresh_token` do cookie e enviará novos cookies atualizados.

> [!CAUTION]
> Ao fazer requisições para a API a partir do frontend, certifique-se de configurar o cliente HTTP (ex: `axios`) para sempre enviar credenciais. Exemplo: `axios.defaults.withCredentials = true;`.

---

## 🧑‍💻 Endpoints de Autenticação

### `POST /api/v1/auth/register`
Cria um novo usuário.
- **Body:**
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "secretpassword"
  }
  ```
- **Retorno:** `201 Created` (Cookies injetados).

### `POST /api/v1/auth/login`
Autentica o usuário.
- **Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "secretpassword"
  }
  ```
- **Retorno:** `200 OK` (Cookies injetados).

### `POST /api/v1/auth/refresh`
Renova os tokens JWT. O cookie `refresh_token` é enviado e avaliado automaticamente.
- **Retorno:** `200 OK` (Novos cookies injetados) ou `401 Unauthorized` se o refresh expirou.

### `POST /api/v1/auth/logout`
Limpa os cookies e invalida a sessão no servidor.
- **Retorno:** `200 OK` (Cookies sobrescritos com tempo de vida 0).

---

## 🛍️ Catálogo (Acesso Público)

Endpoints consumidos pelos clientes (shoppers) da loja para visualização de produtos.

### Produtos

#### `GET /api/v1/catalog/products`
Realiza busca e paginação de produtos, com suporte opcional a filtros.
- **Query Params:**
  - `searchTerm` (String)
  - `category` (Enum: CLOTHING, ACCESSORY, etc.)
  - `targetAudience` (Enum: MEN, WOMEN, UNISEX, KIDS)
  - `collectionId` (Long)
  - `minPrice`, `maxPrice` (BigDecimal)
  - `page` (int, default: 0), `size` (int, default: 12)
- **Retorno:**
  ```json
  {
    "content": [
      {
        "id": 1,
        "name": "T-Shirt Classic",
        "slug": "t-shirt-classic-1",
        "price": 129.90,
        "coverImageUrl": "http://img...",
        "hoverImageUrl": "http://img...",
        "colorsHex": ["#000000", "#FFFFFF"]
      }
    ],
    "pageable": { ... },
    "totalElements": 1,
    "totalPages": 1
  }
  ```

#### `GET /api/v1/catalog/products/slug/{slug}`
Retorna os detalhes completos de um produto a partir do slug (ideal para SEO e Product Detail Page).
- **Retorno:** `ProductResponseDTO` detalhado, incluindo array de `colors` e suas respectivas fotos (`galleryImages`) e tamanhos (`skus`).
- **Comportamento Especial:** Caso o slug passado no frontend esteja desatualizado (por exemplo, se o nome do produto mudou), a API retornará `301 Moved Permanently` apontando para o URL correto no header `Location`.

#### `GET /api/v1/catalog/products/categories`
Obtém categorias disponíveis, opcionalmente filtradas por público-alvo.
- **Query Params:** `targetAudience`

### Coleções

#### `GET /api/v1/catalog/collections`
Obtém todas as coleções, com opções de filtro.
- **Query Params:**
  - `position` (Enum: CAROUSEL_1, GRID, etc.)
  - `targetAudience` (Enum: MEN, WOMEN, etc.)
- **Retorno:** Array de `CollectionResponseDTO`.

#### `GET /api/v1/catalog/collections/slug/{slug}`
Retorna a coleção por slug. (Também tem comportamento de Redirect 301 caso o slug desatualize).

---

## ⚙️ Administração (Requer Autenticação Admin)

Endpoints protegidos destinados a manipulação de dados pelo painel administrativo (CMS).

### Produtos (`/api/v1/admin/products`)
Gerencia o catálogo de produtos.

- **`POST /`** - Cria produto
- **`PUT /{id}`** - Atualiza produto
- **`GET /`** - Lista paginada para o CMS (mesmos filtros do catálogo)
- **`GET /{id}`** - Retorna produto por ID
- **`DELETE /{id}`** - Remove produto

**Exemplo de Payload de Criação/Edição (`ProductRequestDTO`):**
```json
{
  "name": "T-Shirt",
  "description": "Uma camiseta legal",
  "fabricComposition": "100% Algodão",
  "careInstructions": ["Lavar a frio", "Não passar estampas"],
  "price": 89.90,
  "collectionId": null,
  "category": "CLOTHING",
  "targetAudience": "UNISEX",
  "active": true,
  "colors": [
    {
      "colorName": "Preto",
      "colorHex": "#000000",
      "coverImageUrl": "...",
      "hoverImageUrl": "...",
      "galleryImages": ["..."],
      "skus": [
        { "size": "P", "stockQuantity": 10 },
        { "size": "M", "stockQuantity": 15 }
      ]
    }
  ]
}
```

### Coleções (`/api/v1/admin/collections`)
Gerencia as coleções.

- **`POST /`** - Cria coleção
- **`PUT /{id}`** - Atualiza coleção
- **`GET /`** - Lista todas as coleções
- **`GET /{id}`** - Retorna coleção por ID
- **`DELETE /{id}`** - Remove coleção

**Exemplo de Payload de Criação/Edição (`CollectionRequestDTO`):**
```json
{
  "name": "Verão 2026",
  "active": true,
  "imageUrl": "http://img...",
  "displayPosition": "CAROUSEL_1",
  "displayOrder": 1,
  "targetAudience": "WOMEN"
}
```

---
