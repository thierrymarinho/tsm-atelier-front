"use client";

import { useState } from "react";
import { Check, Copy, FlaskConical } from "lucide-react";

// Cartões de teste do Stripe: https://docs.stripe.com/testing
const TEST_CARD = "4242 4242 4242 4242";
const DECLINED_CARD = "4000 0000 0000 0002";

const COPIED_FEEDBACK_MS = 2000;

/**
 * O painel só existe em modo de teste.
 *
 * A checagem é pela chave publicável, e não por uma variável própria, porque é
 * ela que decide de verdade contra qual ambiente o Stripe roda: uma chave
 * `pk_live_` significa dinheiro real, e aí "use o cartão 4242" seria instrução
 * errada exibida numa loja de verdade. Amarrar as duas coisas ao mesmo valor
 * torna impossível ficarem em desacordo.
 */
export function isStripeTestMode(): boolean {
  return (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "").startsWith("pk_test_");
}

export function TestModeCardHints() {
  const [copied, setCopied] = useState(false);

  if (!isStripeTestMode()) return null;

  const copyCard = async () => {
    try {
      await navigator.clipboard.writeText(TEST_CARD.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Sem permissão de área de transferência o número continua na tela,
      // selecionável. Um alerta de erro aqui atrapalharia mais do que ajuda.
    }
  };

  return (
    <aside className="shrink-0 border-b border-muted bg-muted/20 p-6 lg:w-[300px] lg:order-last lg:border-b-0 lg:border-l lg:overflow-y-auto">
      <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        <FlaskConical className="w-3.5 h-3.5" strokeWidth={1.5} />
        Modo de teste
      </p>

      <p className="mt-3 text-sm text-foreground leading-relaxed">
        Nenhuma cobrança é feita. Use um cartão de teste do Stripe para simular o pagamento:
      </p>

      <dl className="mt-5 flex flex-col gap-4 text-sm">
        <div>
          <dt className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Número</dt>
          <dd className="mt-1 flex items-center gap-2">
            <span className="font-mono text-foreground tracking-wide">{TEST_CARD}</span>
            <button
              type="button"
              onClick={copyCard}
              aria-label={copied ? "Número copiado" : "Copiar número do cartão"}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
              ) : (
                <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
            </button>
          </dd>
        </div>

        <div>
          <dt className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Validade</dt>
          <dd className="mt-1 text-foreground">Qualquer data futura — ex.: 12/34</dd>
        </div>

        <div>
          <dt className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Código de segurança
          </dt>
          <dd className="mt-1 text-foreground">Quaisquer 3 dígitos — ex.: 123</dd>
        </div>
      </dl>

      <p className="mt-6 pt-5 border-t border-muted text-xs text-muted-foreground leading-relaxed">
        Para ver uma recusa, use <span className="font-mono">{DECLINED_CARD}</span>. Cartões reais
        não são aceitos neste ambiente.
      </p>
    </aside>
  );
}
