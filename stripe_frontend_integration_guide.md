# Guia de Integração Stripe - Frontend (TSM Atelier)

> **Contexto para a LLM / Assistente de IA:** 
> Você está encarregado de implementar o Frontend (React/Next.js/Vite) para a loja de roupas TSM Atelier. O Backend já está 100% implementado em Java (Spring Boot) seguindo o padrão Ports & Adapters e consumindo a API de Payment Intents da Stripe. 
> Siga rigorosamente este guia abaixo para construir a interface de pagamento.

Este documento descreve como o Frontend deve se comunicar com o Backend e a Stripe para finalizar um fluxo de checkout de forma segura, utilizando o **Payment Intents API** da Stripe.

## 1. Visão Geral da Arquitetura de Pagamento

1. **O Backend nunca toca nos dados do cartão de crédito.**
2. O Backend se comunica com a API da Stripe para manifestar a intenção de receber um pagamento (`PaymentIntent`).
3. O Backend retorna um segredo temporário (`clientSecret`) ao Frontend.
4. O Frontend usa o `clientSecret` em conjunto com a biblioteca oficial da Stripe (Stripe Elements) para renderizar o formulário de pagamento e enviar os dados do cartão **diretamente para a Stripe**.
5. A Stripe processa a compra e, nos bastidores, avisa o Backend via Webhook que o pagamento foi um sucesso.

---

## 2. Passo a Passo da Implementação no Frontend

### Passo 1: Instalação das Bibliotecas da Stripe
No projeto Frontend (React, Next.js, Vite, etc.), instale as bibliotecas oficiais:

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### Passo 2: O Chamado de Checkout para o Backend
Quando o usuário no carrinho clicar em "Finalizar Compra", o Frontend deve fazer uma chamada `POST` para o nosso backend para criar o pedido e gerar o pagamento.

**Requisição:**
`POST /api/v1/orders/checkout`

**Corpo (JSON):**
```json
{
  "addressId": 1,
  "items": [
    {
      "skuId": 1,
      "quantity": 2
    }
  ]
}
```

**Resposta de Sucesso (201 Created):**
```json
{
  "id": 5,
  "status": "PENDING_PAYMENT",
  "totalAmount": 269.90,
  "shippingFee": 20.00,
  "clientSecret": "pi_3MtwBwLkdIwHu7ix28a3tqPc_secret_R7hZkL...",
  "shippingAddress": { ... },
  "expiresAt": "2026-07-27T18:00:00",
  "items": [ ... ]
}
```

O Frontend deve **guardar** a variável `clientSecret`. Ela é o passe de acesso que liga a tela do usuário ao pagamento gerado pela nossa API.

### Passo 3: Renderizando o Formulário da Stripe
Utilize o provedor `Elements` passando o `clientSecret` retornado pela nossa API e sua **Chave Pública da Stripe** (que começa com `pk_test_...`).

```jsx
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm';

// Chave pública da sua conta Stripe (pode ficar exposta no front sem problemas)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function CheckoutPage({ clientSecret }) {
  const options = {
    clientSecret: clientSecret,
    // appearance: { theme: 'night' } // Pode personalizar cores da marca (TSM Atelier) aqui
  };

  return (
    // O Elements deve envolver o componente que contém o formulário de cartão
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm />
    </Elements>
  );
}
```

### Passo 4: Coletando o Pagamento no CheckoutForm
Crie o componente de formulário que exibirá os campos de cartão nativos da Stripe (`PaymentElement`) e disparará o processamento final.

```jsx
import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

export default function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event) => {
    // Evita o reload da página
    event.preventDefault();

    if (!stripe || !elements) {
      // O Stripe.js ainda não carregou
      return;
    }

    setIsProcessing(true);

    // Dispara a confirmação do pagamento diretamente aos servidores da Stripe
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Redireciona o usuário para cá caso o pagamento exija ações extras (como 3D Secure / Validação no app de banco)
        // ou quando finalizar. Opcionalmente você pode tratar tudo via redirect="if_required".
        return_url: `${window.location.origin}/checkout/success`,
      },
    });

    if (error) {
      // O pagamento falhou, o cartão foi recusado, ou o usuário cancelou a autenticação.
      setErrorMessage(error.message);
    } else {
      // Com redirect="if_required", o sucesso é tratado aqui, caso contrário a página foi redirecionada.
    }
    
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button disabled={!stripe || isProcessing}>
        {isProcessing ? 'Processando...' : 'Pagar agora'}
      </button>
      
      {/* Exibe qualquer mensagem de erro (ex: cartão sem saldo) */}
      {errorMessage && <div>{errorMessage}</div>}
    </form>
  );
}
```

---

## 3. O que acontece depois do Pagamento?

1. **Frontend (O que o usuário vê):** Se o pagamento der certo, a própria biblioteca da Stripe redireciona o usuário para a sua página de sucesso (ex: `/checkout/success`). Neste ponto, o pagamento está confirmado.
2. **Backend (O que o sistema faz invisivelmente):** Imediatamente após a Stripe processar o pagamento com sucesso, ela envia um `POST` invisível para a rota de **Webhook** do nosso Backend avisando que aquele `PaymentIntent` foi concluído.
3. **Mágica:** É o nosso Backend quem capta essa mensagem do Webhook, cruza as informações, altera permanentemente o status do pedido para `PAID` e marca o estoque vendido.

> [!WARNING]
> **Regra de Segurança de Ouro:**
> O Frontend NUNCA deve chamar a nossa própria API (ex: `POST /api/orders/update-status`) dizendo "Ei, o pagamento deu certo, marque como pago". Um usuário mal intencionado poderia inspecionar o código da página e forjar essa requisição sem ter pagado de verdade.
> A única fonte da verdade e de aprovação do pedido **deve sempre vir do Webhook da Stripe** se comunicando server-to-server com o nosso Backend.
