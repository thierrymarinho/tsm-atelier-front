# Guia de Integração do Carrinho (Frontend)

Este documento detalha as regras de negócio e os retornos da API do Carrinho atualizados recentemente. O objetivo é guiar a implementação no Frontend, garantindo uma experiência fluida para o usuário.

## 1. Novos Campos no Retorno do Carrinho

Os endpoints que retornam os itens do carrinho (`GET /api/v1/cart`, e os retornos de `POST`, `PUT`, `DELETE` no carrinho) agora incluem dois novos campos em cada item (`CartItemResponseDTO`):

*   **`stockQuantity` (Integer):** A quantidade real em estoque no banco de dados para aquele SKU.
*   **`available` (Boolean):** Indica se o produto ainda pode ser comprado. Será `false` caso:
    *   O estoque (`stockQuantity`) chegue a zero.
    *   O produto seja inativado no painel Admin (`active = false`).
    *   O produto ou o SKU específico tenha sido deletado (soft-delete).

> [!TIP]
> **Como o Frontend deve usar isso?**
> *   Se `available` for `false`, exiba um badge vermelho de "Indisponível" e desabilite o botão de finalizar compra até que o usuário remova o item (ou oculte o item visualmente com um aviso).
> *   Use o `stockQuantity` para travar o botão de **`+`** (aumentar quantidade) caso o usuário já tenha alcançado o estoque máximo disponível.

## 2. Limite Máximo por Item

Foi estabelecido um limite global de negócio: **No máximo 10 unidades do mesmo item (SKU) por carrinho.**

*   **Validação Frontend:** Os botões de aumentar a quantidade (`+`) devem ser desabilitados quando o valor chegar a 10 (ou quando chegar ao `stockQuantity`, o que for menor).
*   **Validação Backend:** Se o frontend enviar uma requisição (`POST` ou `PUT`) tentando colocar mais de 10 unidades, a API retornará um erro `400 Bad Request` ou `409 Conflict` (OutOfStockException), dependendo do endpoint.

## 3. Tratamento de Erro: Falta de Estoque (409 Conflict)

Se o usuário tentar adicionar ou atualizar um item para uma quantidade maior do que a disponível em estoque (ex: tenta adicionar 3, mas só tem 2), a API retornará o status HTTP **`409 Conflict`**.

**O que mudou:** O payload de erro (`ProblemDetail`) agora inclui uma propriedade customizada chamada `availableQuantity`.

**Exemplo de Resposta (409 Conflict):**
```json
{
  "type": "about:blank",
  "title": "Out of stock",
  "status": 409,
  "detail": "Not enough stock for SKU: SKU-123. Available: 2",
  "instance": "/api/v1/cart/items",
  "availableQuantity": 2
}
```

> [!IMPORTANT]
> **Como o Frontend deve usar isso?**
> Intercepte o erro `409`. Leia a propriedade `availableQuantity` do JSON de erro e exiba uma mensagem amigável para o usuário:
> *"Infelizmente, só temos {availableQuantity} unidades deste produto disponíveis no momento."*

## 4. Comportamento do Sync (`POST /api/v1/cart/sync`)

O endpoint de sincronização (usado para mesclar o carrinho local do usuário não logado com o carrinho do banco quando ele faz login) foi atualizado para lidar com conflitos de forma "silenciosa", visando a melhor experiência do usuário:

*   **Soma de Quantidades:** Se o usuário tinha 2 unidades locais e já tinha 1 no banco, o sync tentará mesclar para 3.
*   **Cap Automático (Limite):** Se a soma ultrapassar o estoque ou o limite de 10 unidades, o backend ajustará automaticamente a quantidade para o máximo permitido (o menor valor entre `stockQuantity` e `10`), sem disparar erros que travariam o login.
*   **Falhas Ignoradas:** Se o frontend tentar sincronizar um SKU que não existe mais (ex: foi deletado do banco), esse item específico será ignorado e não adicionado ao carrinho final, sem quebrar o resto do processo de sync.

---

### Resumo do Fluxo Ideal (Frontend)

1.  Bater no `GET /cart`.
2.  Para cada item, checar `available`. Se `false` -> UI de "Indisponível".
3.  Definir valor máximo do input numérico de quantidade como: `Math.min(10, item.stockQuantity)`.
4.  Ao clicar em "Checkout", garantir que não há itens com `available === false`.
5.  Estar preparado para exibir Toast/Notificação caso um `PUT` de alteração de quantidade retorne `409` com a propriedade `availableQuantity`.
