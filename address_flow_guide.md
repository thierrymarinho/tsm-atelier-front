# Guia de Integração: Gestão de Endereços (TSM Atelier)

Este documento detalha o fluxo de endereços de entrega na API do TSM Atelier, útil para implementar tanto a seção de "Meus Endereços" no perfil do usuário quanto a etapa de "Selecionar Endereço" na página de Checkout.

## 1. Visão Geral da API
Todos os endpoints de endereço requerem autenticação (o usuário deve enviar o `Bearer Token` no header `Authorization`). A API resolve automaticamente quem é o usuário através do token JWT.

A rota base é: `/api/v1/addresses`

---

## 2. Endpoints Disponíveis

### 2.1 Listar Endereços (`GET /api/v1/addresses`)
Retorna um array com todos os endereços cadastrados pelo usuário logado.

**Resposta de Sucesso (200 OK):**
```json
[
  {
    "id": 1,
    "street": "Rua das Flores",
    "number": "123",
    "complement": "Apto 45",
    "neighborhood": "Jardim Primavera",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01234-567",
    "isDefault": true
  },
  {
    "id": 2,
    "street": "Av. Paulista",
    "number": "1000",
    "complement": "Andar 10",
    "neighborhood": "Bela Vista",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01310-100",
    "isDefault": false
  }
]
```
> **Dica para o Checkout:** Como o backend retorna um array, o Frontend pode iterar (`addresses.find(a => a.isDefault === true)`) para descobrir qual endereço pré-selecionar no carrinho.

---

### 2.2 Criar um Endereço (`POST /api/v1/addresses`)
Cria um novo endereço e o vincula automaticamente ao usuário logado.

**Corpo (JSON):**
```json
{
  "street": "Rua Augusta",
  "number": "500",
  "complement": "",
  "neighborhood": "Consolação",
  "city": "São Paulo",
  "state": "SP",
  "zipCode": "01304-000",
  "isDefault": false
}
```
> **Nota de Negócio:** 
> - Se o usuário passar `"isDefault": true` no payload de criação, o backend marcará **este** endereço como padrão e removerá o título de padrão de qualquer outro endereço que ele tinha antes.
> - Se for o **primeiro** endereço da conta do usuário, o backend forçará automaticamente `isDefault: true`, independente do payload.

---

### 2.3 Atualizar um Endereço (`PUT /api/v1/addresses/{id}`)
Atualiza todos os dados de um endereço específico.

**Corpo (JSON):**
O payload é idêntico ao de Criação (POST).

---

### 2.4 Mudar o Endereço Padrão (`PATCH /api/v1/addresses/{id}/default`)
Se o usuário tiver 5 endereços e quiser transformar o Endereço ID 3 no seu endereço padrão de entregas, o Frontend não precisa enviar o payload completo. Basta chamar essa rota específica.

**Requisição:**
`PATCH /api/v1/addresses/3/default` (Sem corpo/payload).

**O que o Backend faz:** O backend altera o `isDefault` do ID 3 para `true` e muda os outros 4 endereços para `false`.

---

### 2.5 Deletar um Endereço (`DELETE /api/v1/addresses/{id}`)
Apaga o endereço permanentemente.

**Requisição:**
`DELETE /api/v1/addresses/1`

**Resposta de Sucesso:** `204 No Content` (sem corpo JSON).

> **Atenção:** Deletar um endereço **NÃO** afeta o histórico de pedidos passados. O TSM Atelier salva uma "cópia" do endereço (Snapshot) dentro da entidade do pedido (Order) no momento da compra. Então, recibos passados nunca quebrarão se o usuário apagar ou alterar sua casa atual.

---

## 3. Sugestão de Fluxo no Frontend (Tela de Checkout)

1. **Inicialização (`useEffect`)**: O Frontend faz um `GET /api/v1/addresses`.
2. **Nenhum Endereço**: Se a lista voltar `[]`, o Frontend exibe imediatamente o formulário pedindo para o usuário cadastrar seu endereço (chamando o `POST /api/v1/addresses`).
3. **Endereços Encontrados**: Se a lista voltar preenchida, o Frontend exibe um "Card" com os dados do endereço que tem `isDefault: true`.
4. **Trocar Endereço**: Um botão "Entregar em outro endereço" abre um Modal listando os outros endereços para o cliente escolher, ou oferece a opção "Adicionar novo endereço" dentro desse mesmo modal.
5. **Finalizar**: O ID do endereço que estiver selecionado na tela é o ID que será injetado no payload do `POST /api/v1/orders/checkout`.
