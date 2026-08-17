# Deploy — TSM Atelier

Passo a passo para publicar a aplicação em **Neon** (Postgres), **Upstash**
(Redis), **Render** (Spring Boot) e **Vercel** (Next.js), com Stripe e
Cloudinary integrados.

Cada afirmação aqui foi conferida na documentação do provedor ou medida
localmente. Onde não deu para verificar, está dito.

---

## 1. O mapa

```
                        ┌─────────────────────────────┐
   navegador  ─────────→│  Vercel — Next.js           │
                        │  sualoja.vercel.app         │
                        │                             │
                        │  /            páginas SSR   │
                        │  /api/:path*  ──┐ rewrite   │
                        └─────────────────┼───────────┘
                                          │
                        ┌─────────────────▼───────────┐
     Stripe ───────────→│  Render — Spring Boot       │
     (webhook, pelo     │  tsm-atelier-api            │
      rewrite acima)    └──┬────────────┬─────────┬───┘
                           │            │         │
                    ┌──────▼───┐  ┌─────▼────┐  ┌─▼──────────┐
                    │  Neon    │  │ Upstash  │  │ Cloudinary │
                    │ Postgres │  │  Redis   │  │  imagens   │
                    └──────────┘  └──────────┘  └────────────┘
```

**O navegador nunca fala com o Render.** Ele chama `/api/v1/...` no próprio
domínio da Vercel, que repassa. Isso é o que resolve o cross-origin — e a seção
2 explica por que sem isso a loja quebraria de um jeito difícil de diagnosticar.

---

## 2. Por que o rewrite, e não uma URL absoluta

Os cookies emitidos pelo Spring Boot são:

| Cookie | Flags |
|---|---|
| `__Host-access_token` | `HttpOnly`, `Secure`, `Path=/`, `SameSite=Strict` |
| `__Secure-refresh_token` | `HttpOnly`, `Secure`, `Path=/api/v1/auth`, `SameSite=Strict` |
| `__Host-XSRF-TOKEN` | `Secure`, `Path=/`, `SameSite=Strict` (legível pelo JS) |

- **`SameSite=Strict` só envia o cookie na mesma origem.** Com URL absoluta para
  o Render, o catálogo público continuaria funcionando e **toda ação
  autenticada falharia**. A loja pareceria saudável enquanto carrinho, checkout
  e painel quebrariam — o pior formato de falha que existe.
- **O prefixo `__Host-` exige `Secure`, `Path=/` e ausência de `Domain`.** O
  navegador **recusa** o cookie se faltar qualquer uma. HTTPS é obrigatório, e
  o cookie não atravessa subdomínios.
- **Não há CORS no backend, de propósito.** Chamar de outra origem não devolve
  um erro de CORS legível: a requisição morre antes de chegar à aplicação.

### ⚠️ O destino do rewrite é assado no build

O `rewrites()` do `next.config.ts` roda durante o `next build`, e o resultado vai
para `routes-manifest.json`. **Verificado** no build local:

```json
{ "source": "/api/:path*", "destination": "http://localhost:8080/api/:path*" }
```

Três consequências:

- `SPRING_BOOT_API_URL` precisa existir **antes do build**, não só em runtime.
- **Trocar a URL do backend exige novo deploy.** A própria Vercel documenta que
  "mudanças em variáveis de ambiente não se aplicam a deployments anteriores".
- Se a variável faltar, o build **falha alto** — proposital, porque uma aplicação
  apontando para lugar nenhum é pior que uma que não sobe.

---

## 3. A ordem, e o nó que ela desfaz

```
1. Neon        →  2. Upstash  →  3. Cloudinary  →  4. Resend
                                      ↓
5. Criar projeto na Vercel (SEM deploy)  ──→ obtém a URL pública
                                      ↓
6. Stripe: cadastrar webhook nessa URL   ──→ obtém o whsec_
                                      ↓
7. Render: subir o backend               ──→ obtém a URL da API
                                      ↓
8. Vercel: primeiro deploy
                                      ↓
9. Render: preencher APP_BASE_URL e redeploy
```

**O nó está entre 5, 6 e 7.** O backend **não sobe** com `STRIPE_WEBHOOK_SECRET`
vazio — é um `@PostConstruct` que derruba a aplicação de propósito, porque
segredo vazio ainda produz assinatura verificável e qualquer um poderia forjar um
pagamento aprovado. Mas o `whsec_` só nasce quando o endpoint é cadastrado, e o
endpoint aponta para a URL da Vercel.

Desfaz assim: **crie o projeto na Vercel antes de fazer deploy**. O domínio
`*.vercel.app` é atribuído na criação, e a Stripe aceita registrar um endpoint
que ainda não responde.

**O front vem depois do backend** por outro motivo: a home é pré-renderizada e
busca a coleção da capa **durante o build**. Com o backend fora do ar, o hero cai
no fallback com a marca, e esse HTML fica servido até a revalidação.

---

## 4. Passo a passo

### 4.1 Neon — Postgres

1. Criar projeto. Anote a região — **use a mesma região no Render**, ou cada
   consulta paga ida e volta pela internet.
2. Em **Connection Details**, copie a string. Ela tem o formato:
   ```
   postgresql://[user]:[senha]@ep-xxxx-yyyy.[região].aws.neon.tech/[banco]?sslmode=require
   ```
3. **Desligue o toggle de connection pooling** e use a conexão **direta**.

   Isso é decisão, não descuido. O host com sufixo `-pooler` é um PgBouncer em
   **modo transaction**, que devolve a conexão ao pool a cada transação e quebra
   `SET`/`RESET` de sessão, `LISTEN`/`NOTIFY`, prepared statements de SQL,
   tabelas temporárias e advisory locks de sessão. A própria documentação do Neon
   recomenda conexão direta para aplicações de processo longo com pool próprio —
   que é exatamente o caso: o Spring Boot tem HikariCP.

4. Converta para JDBC. O Spring recebe usuário e senha separados, então saem da
   URL:

   ```
   SPRING_DATASOURCE_URL=jdbc:postgresql://ep-xxxx-yyyy.[região].aws.neon.tech/[banco]?sslmode=require
   DB_USER=[user]
   DB_PASSWORD=[senha]
   ```

   > `sslmode=require` não é opcional — o Neon recusa conexão sem TLS.

5. Não crie tabela nenhuma. O **Flyway roda as migrations na partida** do
   backend e semeia o admin.

### 4.2 Upstash — Redis

1. Criar o banco na região mais próxima do Render.
2. Na aba de conexão, pegue **endpoint**, **porta** e **senha**.
3. **TLS é ligado por padrão** no Upstash e não pode ser desativado. O projeto já
   tem o interruptor parametrizado, então basta:

   ```
   REDIS_HOST=[endpoint, sem o esquema rediss://]
   REDIS_PORT=6379
   REDIS_PASSWORD=[senha]
   REDIS_SSL_ENABLED=true
   ```

   Não use a URL `rediss://…` inteira: o `application.yaml` liga host, porta,
   senha e SSL separadamente (`spring.data.redis.*`).

4. Aumente os tempos limite. O padrão do projeto é 2s/3s, pensado para um Redis
   local; atravessando a internet, isso é apertado:

   ```
   REDIS_TIMEOUT=5s
   REDIS_CONNECT_TIMEOUT=10s
   ```

> **Redis não é cache opcional aqui.** Ele guarda o token de verificação de
> e-mail, os contadores de tentativa de login e o estado dos refresh tokens —
> que é o que detecta reuso de token e revoga todas as sessões da conta. Sem ele,
> cadastro e login quebram.

### 4.3 Cloudinary

1. Criar conta. No Dashboard, copiar **Cloud name**, **API Key** e **API Secret**.
2. Vão para o **backend** — o front nunca fala com o Cloudinary para escrever:

   ```
   CLOUDINARY_CLOUD_NAME=…
   CLOUDINARY_API_KEY=…
   CLOUDINARY_API_SECRET=…
   ```

3. Nada a configurar no front. Ele já usa um loader customizado
   (`src/lib/cloudinary-loader.ts`) que empurra a transformação para o CDN do
   Cloudinary — o que devolve AVIF/WebP e variantes por largura **sem consumir a
   cota de otimização de imagem da Vercel**.

### 4.4 Resend

1. Criar a API key.
2. **Verifique um domínio** se o e-mail de verificação for para endereço real. O
   remetente padrão (`onboarding@resend.dev`) só entrega para o dono da conta.

   ```
   RESEND_API_KEY=…
   RESEND_FROM_EMAIL=nao-responda@seudominio.com
   ```

3. Se faltar, o cadastro **continua funcionando** — o envio é assíncrono e a
   falha é logada sem propagar. O que não acontece é a confirmação da conta.

### 4.5 Vercel — criar o projeto, sem publicar ainda

1. Importar o repositório do front. O preset Next.js é detectado sozinho.
2. **Anotar o domínio** `https://<projeto>.vercel.app`. É dele que os passos 4.6
   e 4.9 dependem.
3. Cadastrar as duas variáveis, marcando **Production e Preview**:

   | Variável | Valor |
   |---|---|
   | `SPRING_BOOT_API_URL` | a URL do Render — que ainda não existe; volte aqui no passo 4.7 |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_…` ou `pk_test_…` |

4. **Ainda não faça deploy.** Sem o backend no ar, o build assa uma home errada.

### 4.6 Stripe — o webhook antes do backend

1. Developers → Webhooks → **Add endpoint**.
2. URL: `https://<projeto>.vercel.app/api/v1/webhooks/stripe`

   **Sim, apontando para o front.** O rewrite repassa bytes, então o corpo cru e
   o header `Stripe-Signature` chegam intactos ao Spring, e a verificação de
   assinatura — calculada sobre o corpo exato — continua válida. **Verificado
   nesta sessão**: um evento `payment_intent.succeeded` assinado localmente foi
   aceito por esse caminho e moveu o pedido para `PAID`.

   O ganho é que **o Render não precisa ser alcançável pela internet**. É a
   proteção inteira que o padrão BFF existe para dar.

3. Eventos a assinar: `payment_intent.succeeded` e
   `payment_intent.payment_failed` — os dois únicos que o backend trata.
4. Copiar o **Signing secret** (`whsec_…`).
5. Copiar também a **chave secreta** (`sk_…`) e a **publicável** (`pk_…`).

### 4.7 Render — o backend

1. Adicionar ao repositório do backend os arquivos da seção 5. Sem eles não há o
   que publicar.
2. New → **Blueprint** e apontar para o repositório: o Render lê o `render.yaml`
   e pede os valores marcados como `sync: false`.

   Ou, sem Blueprint: New → Web Service, **Runtime: Docker**, e preencher as
   variáveis no painel.

3. **Plano.** O `render.yaml` vem com `starter`. Ver a seção 8 antes de trocar
   para `free`.
4. Preencher todas as variáveis da tabela 6.2, **menos `APP_BASE_URL`** — ela
   entra no passo 4.9.
5. Deploy. O primeiro sobe o esquema pelo Flyway e semeia o admin.
6. Anotar a URL: `https://tsm-atelier-api.onrender.com`.
7. **Voltar à Vercel** e preencher `SPRING_BOOT_API_URL` com essa URL, **sem a
   barra final e sem `/api`** — o rewrite já acrescenta `/api/:path*`.

### 4.8 Vercel — publicar

1. Confirmar que `SPRING_BOOT_API_URL` está preenchida em Production e Preview.
2. Deploy.
3. Se o build falhar com `Missing required environment variable`, a variável não
   estava no ambiente que construiu. É a mensagem funcionando como projetada.

### 4.9 Fechar o círculo

De volta ao Render, preencher e **redeployar**:

```
APP_BASE_URL=https://<projeto>.vercel.app
```

É essa variável que monta o link de verificação de e-mail. Apontá-la para o
backend gera links quebrados — e o cadastro parece funcionar até alguém tentar
confirmar a conta.

---

## 5. Arquivos a adicionar

### Backend (`tsm-atelier`) — três arquivos, já criados

**`Dockerfile`** — build em duas etapas. **Verificado**: a imagem constrói, o
contêiner sobe em ~12s e responde na porta injetada por `$PORT`.

Pontos que não são estilo:

- O **wrapper baixa o Gradle 9.6.1**, então a imagem de build só precisa do JDK.
  O `build.gradle.kts` pede toolchain **Java 25** — mais novo que o runtime
  nativo de Java do Render, e é por isso que Docker aqui não é preferência.
- Dependências numa camada separada do `src`: enquanto o `build.gradle.kts` não
  mudar, o Docker reusa a camada e o deploy não rebaixa tudo.
- `-XX:MaxRAMPercentage=75` faz a JVM enxergar o limite do contêiner. Sem isso
  ela dimensiona a heap pela memória da máquina hospedeira e o provedor mata o
  processo por OOM.
- `--server.port=${PORT:-8080}` no `ENTRYPOINT`. O Render **injeta `PORT`**
  (padrão `10000`) e exige bind em `0.0.0.0` — que já é o padrão do Tomcat. O
  fallback mantém o mesmo comando funcionando localmente.

**`.dockerignore`** — o contexto inteiro é enviado ao daemon antes de qualquer
camada rodar; `build/` e `.git/` sozinhos somam centenas de megabytes.

**`render.yaml`** — o Blueprint. Segredos entram como `sync: false`, que faz o
Render perguntar uma vez e guardar cifrado; o arquivo é versionado, e qualquer
valor escrito nele estaria no Git para sempre. `JWT_SECRET` usa
`generateValue: true`, que gera 256 bits em base64 — melhor que qualquer coisa
digitada à mão.

### Backend — uma mudança recomendada em `application.yaml`

O Neon **suspende o compute após 5 minutos de ociosidade**, e no plano gratuito
isso não pode ser desligado. Ele volta em algumas centenas de milissegundos, mas
as conexões que o Hikari mantinha abertas morrem no meio. A documentação do Neon
recomenda reciclar conexões por tempo de vida:

```yaml
spring:
  datasource:
    hikari:
      max-lifetime: 240000     # 4 min — recicla antes do autosuspend de 5
      keepalive-time: 120000
      minimum-idle: 1
```

> Isto é **recomendação da documentação, não medição minha** — não consegui
> reproduzir o autosuspend localmente. Se aparecerem erros de conexão esporádicos
> depois de períodos ociosos, é aqui que se mexe.

### Front-end (`tsm-atelier-front`) — **nenhum arquivo novo é obrigatório**

A Vercel detecta o Next.js e usa os scripts do `package.json`. O rewrite já está
no `next.config.ts` e **não** deve virar `vercel.json`.

Opcional: fixar a versão do Node, já que o Next 16.2.10 declara
`engines.node >= 20.9.0`:

```json
"engines": { "node": ">=20.9.0" }
```

> **Não use export estático.** A aplicação depende de runtime Node: há Server
> Actions (`src/lib/api/revalidate.ts`), páginas com ISR e busca no servidor.
> `output: 'export'` quebraria os três.

---

## 6. Variáveis de ambiente

### 6.1 Vercel (front) — duas

| Variável | Escopo | Obrigatória | Lida em |
|---|---|---|---|
| `SPRING_BOOT_API_URL` | servidor | **sim** | build (rewrite) **e** runtime (Server Components) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | público | sim | build — embutida no bundle |

`SPRING_BOOT_API_URL` **não leva `NEXT_PUBLIC_`**, e é esse o ponto: sem o
prefixo ela nunca entra no bundle do navegador. Uma variável só alimenta o
rewrite e as buscas do servidor, para as duas metades não poderem apontar para
backends diferentes.

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` é legível por qualquer um via view-source —
seguro por projeto, é a chave publicável. A secreta mora no Render.

**Não existe variável para a base da API no navegador.** É o `/api` relativo,
fixo em `src/lib/api/client.ts`, pelo motivo da seção 2.

### 6.2 Render (backend)

Sem valor padrão — **a aplicação não sobe sem elas**:

| Variável | Origem |
|---|---|
| `DB_PASSWORD` | Neon |
| `JWT_SECRET` | `generateValue` do Blueprint |
| `STRIPE_API_KEY` | Stripe, `sk_…` |
| `STRIPE_WEBHOOK_SECRET` | Stripe, `whsec_…` do endpoint criado em 4.6 |
| `ADMIN_PASSWORD_HASH` | hash BCrypt que você gerar |

Com padrão, mas que este deploy exige:

| Variável | Valor | Nota |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://ep-….neon.tech/[banco]?sslmode=require` | conexão **direta**, sem `-pooler` |
| `DB_USER` | do Neon | |
| `REDIS_HOST` / `REDIS_PORT` | do Upstash / `6379` | |
| `REDIS_PASSWORD` | do Upstash | |
| `REDIS_SSL_ENABLED` | `true` | obrigatório no Upstash |
| `REDIS_TIMEOUT` / `REDIS_CONNECT_TIMEOUT` | `5s` / `10s` | o padrão de 2s/3s é para Redis local |
| `APP_BASE_URL` | URL da **Vercel** | monta o link de verificação de e-mail |
| `CLOUDINARY_*` | do Cloudinary | sem elas o upload do painel falha |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | do Resend | sem elas o e-mail não sai |
| `LOG_LEVEL` / `JPA_SHOW_SQL` | `INFO` / `false` | **nunca** `JPA_SHOW_SQL=true` em produção |

> **A senha do admin em produção não é a de desenvolvimento.** `senha123` só vale
> localmente, onde a migration usa um placeholder do Flyway. Em produção o hash
> vem de `ADMIN_PASSWORD_HASH`, e a conta semeada é `admin@tsm-atelier.com`.

---

## 7. Verificação depois do deploy

Nesta ordem — cada passo depende do anterior.

```bash
FRONT=https://sualoja.vercel.app

# 1. A loja responde, e o catálogo chegou (não é a home de fallback)
curl -s $FRONT | grep -c "Explorar Coleção"

# 2. O rewrite está de pé: JSON do Spring, não HTML do Next
curl -s $FRONT/api/v1/catalog/collections | head -c 200

# 3. Os cookies vêm com prefixo e flags corretos
curl -si -X POST $FRONT/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@tsm-atelier.com","password":"…"}' | grep -i set-cookie
```

O passo 3 tem que mostrar `__Host-access_token` com `Secure`, `HttpOnly`,
`Path=/` e `SameSite=Strict`. Faltando qualquer um, **o navegador descarta o
cookie em silêncio** e o login parece funcionar sem funcionar.

Depois, no navegador:

- Entrar em `/admin` com a conta de admin.
- Salvar uma coleção e conferir que a vitrine muda na visita seguinte — é o
  `updateTag` das Server Actions funcionando.
- Uma compra de ponta a ponta com cartão de teste, e conferir que o pedido saiu
  de `PENDING_PAYMENT` — é o webhook chegando pelo rewrite.

---

## 8. Armadilhas

### O plano gratuito do Render é hostil a este stack

A documentação do Render é explícita: serviço no plano `free` **hiberna após 15
minutos sem tráfego**, e a volta leva **cerca de um minuto**, com uma página de
carregamento no lugar da loja. São 750 horas por mês.

Some a isso o custo de partida de uma JVM. O `AGENTS.md` diz que este projeto é
vitrine de portfólio: se alguém abrir o link e esperar um minuto numa tela de
carregamento, o trabalho inteiro é julgado por isso.

**É o único item aqui que vale pagar.** O front na Vercel não hiberna e o Neon
volta em milissegundos. O `render.yaml` já vem com `starter` por esse motivo.

### O cache de dados é de 5 minutos

As páginas da loja são renderizadas no servidor com `revalidate: 300`. Gravações
pelo painel expiram a entrada na hora, via `updateTag` — mas só as de produto e
coleção. O ajuste de estoque só avisa quando o número **cruza o zero**, que é a
única transição que muda o que a vitrine mostra.

O que sobra de defasagem é do navegador de quem já estava no site: aba aberta não
se atualiza sozinha, e a navegação interna pode reusar a página guardada pelo
cache de roteador do Next. Recarregar resolve; nenhuma configuração de servidor
resolve.

### Construir o front com o backend fora do ar

A `/` é pré-renderizada e busca a coleção da capa durante o build. Se o Render
não responder, `catalogFetch` devolve `null`, o hero cai no fallback com a marca,
e **esse HTML fica servido até a revalidação**. Suba o backend antes.

### Mudar variável na Vercel não muda o deploy atual

Documentado pela Vercel: alterações só valem para **novos** deployments. Isso
vale em dobro para `SPRING_BOOT_API_URL`, que além disso está assada no
`routes-manifest.json`.

### `403` nunca significa sessão expirada

É falta de permissão ou header CSRF ausente. Um cliente HTTP que trate `403` como
token vencido entra em laço de refresh e desloga quem estava perfeitamente
autenticado.

---

## 9. Pendências

- [ ] Gerar `ADMIN_PASSWORD_HASH` (BCrypt) e guardar a senha em lugar seguro.
- [ ] Verificar um domínio no Resend, se a confirmação de e-mail for para
      endereço real.
- [ ] Decidir o plano do Render — ver a seção 8.
- [ ] Depois de confirmar que o webhook passa pelo rewrite, **restringir o acesso
      de rede ao Render** para que só a Vercel o alcance.
- [ ] Aplicar a configuração do Hikari da seção 5 se aparecerem erros de conexão
      depois de períodos ociosos.
- [ ] Trocar as chaves de teste da Stripe pelas de produção — o `whsec_` é **por
      endpoint** e o de desenvolvimento não vale em produção.

---

## Fontes

- [Render — Blueprint spec](https://render.com/docs/blueprint-spec)
- [Render — Web services e a variável `PORT`](https://render.com/docs/web-services)
- [Render — limites do plano gratuito](https://render.com/docs/free)
- [Neon — conectar de qualquer aplicação](https://neon.com/docs/connect/connect-from-any-app)
- [Neon — connection pooling](https://neon.com/docs/connect/connection-pooling)
- [Neon — scale to zero](https://neon.com/docs/introduction/scale-to-zero)
- [Upstash — conectar um cliente Redis](https://upstash.com/docs/redis/howto/connect-client)
- [Vercel — variáveis de ambiente](https://vercel.com/docs/environment-variables)
