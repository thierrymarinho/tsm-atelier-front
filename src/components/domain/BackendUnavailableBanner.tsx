"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient, type Query } from "@tanstack/react-query";
import { Clock, Loader2 } from "lucide-react";
import { isBackendUnavailable } from "@/lib/api/client";

export const BACKEND_UNAVAILABLE_MESSAGE =
  "O servidor está despertando da hibernação e pode levar até um minuto. Aguarde alguns instantes e tente novamente.";

const RETRY_INTERVAL_SECONDS = 15;

// Quatro tentativas cobrem o minuto do spin-up. Depois disso o backend está
// fora por outro motivo, e insistir sozinho só somaria carga — o botão
// continua ali para quem quiser tentar de novo.
const MAX_ATTEMPTS = 4;

/**
 * Aviso único para toda falha de backend vista pelo navegador.
 *
 * Vive aqui, e não espalhado em `isError` por query, porque uma abertura de
 * menu dispara oito requisições: com tratamento local, uma queda viraria oito
 * avisos simultâneos dizendo a mesma coisa. O estado é derivado do cache do
 * React Query, então qualquer query de qualquer tela alimenta o mesmo aviso.
 */
export function BackendUnavailableBanner() {
  const queryClient = useQueryClient();
  const [isDown, setIsDown] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const cache = queryClient.getQueryCache();

    const sync = () => {
      const down = cache
        .getAll()
        .some((query) => query.state.status === "error" && isBackendUnavailable(query.state.error));

      setIsDown(down);

      // Recuperou: zera o contador aqui, e não num efeito à parte, para o ciclo
      // seguinte de queda voltar a ter as quatro tentativas automáticas.
      setAttempt((current) => (down ? current : 0));
    };

    sync();
    return cache.subscribe(sync);
  }, [queryClient]);

  const retry = useCallback(async () => {
    setIsRetrying(true);
    try {
      const failed = (query: Query) => query.state.status === "error";

      // Só o que falhou, e só o que alguém ainda está esperando. Refazer o
      // cache inteiro despejaria requisições de telas fechadas em cima de um
      // backend que ainda está subindo.
      await queryClient.refetchQueries({ type: "active", predicate: failed });

      // As queries do header ficam `enabled: false` com o menu fechado, e
      // query desabilitada nunca refaz — sem isto o aviso ficaria preso no
      // erro de uma requisição que ninguém mais está esperando. Descartar o
      // erro é o certo: se o backend continuar fora, a próxima abertura de
      // menu falha de novo e o aviso volta.
      queryClient.resetQueries({ type: "inactive", predicate: failed });
    } finally {
      setIsRetrying(false);
    }
  }, [queryClient]);

  useEffect(() => {
    if (!isDown || attempt >= MAX_ATTEMPTS) return;

    const timer = setTimeout(() => {
      setAttempt((current) => current + 1);
      void retry();
    }, RETRY_INTERVAL_SECONDS * 1000);

    return () => clearTimeout(timer);
  }, [isDown, attempt, retry]);

  if (!isDown) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-background/20 bg-foreground text-background"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-3">
          <Clock className="hidden h-5 w-5 shrink-0 opacity-60 sm:block" strokeWidth={1.5} />
          <p className="text-xs leading-relaxed tracking-wide sm:text-sm">{BACKEND_UNAVAILABLE_MESSAGE}</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setAttempt(0);
            void retry();
          }}
          disabled={isRetrying}
          className="inline-flex shrink-0 items-center gap-2 border border-background/40 px-6 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors hover:bg-background/10 disabled:opacity-50"
        >
          {isRetrying && <Loader2 className="h-3 w-3 animate-spin" />}
          {isRetrying ? "Tentando" : "Tentar agora"}
        </button>
      </div>
    </div>
  );
}
