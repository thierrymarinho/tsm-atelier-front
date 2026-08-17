"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

const RETRY_INTERVAL_SECONDS = 10;

// Seis tentativas cobrem o minuto que o spin-up leva. Passado isso o backend
// está fora por outro motivo, e insistir para sempre só somaria carga a ele.
const MAX_ATTEMPTS = 6;

export function ColdStartNotice() {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(RETRY_INTERVAL_SECONDS);

  const exhausted = attempt >= MAX_ATTEMPTS;

  useEffect(() => {
    if (exhausted) return;

    const timer = setInterval(() => {
      setSecondsLeft((remaining) => {
        if (remaining > 1) return remaining - 1;

        setAttempt((current) => current + 1);
        router.refresh();
        return RETRY_INTERVAL_SECONDS;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [exhausted, router]);

  return (
    <div className="flex-1 w-full min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="flex justify-center text-muted-foreground/30 mb-8">
          <Clock className="w-20 h-20" strokeWidth={1} />
        </div>

        <h1 className="font-serif text-2xl md:text-3xl tracking-widest uppercase text-foreground">
          Aviso de cold start
        </h1>

        <p className="text-muted-foreground tracking-wide text-sm md:text-base leading-relaxed max-w-md mx-auto">
          Este ambiente de demonstração utiliza uma arquitetura scale-to-zero para otimização de
          recursos. Nossa API está despertando da hibernação. Este processo inicial pode levar até
          um minuto.
        </p>

        <p className="text-[10px] tracking-widest uppercase text-muted-foreground/60 font-mono">
          {exhausted
            ? "Tentativas automáticas encerradas"
            : `Nova tentativa em ${secondsLeft}s · ${attempt + 1} de ${MAX_ATTEMPTS}`}
        </p>

        <div className="pt-8 flex justify-center">
          <button
            onClick={() => {
              setAttempt(0);
              setSecondsLeft(RETRY_INTERVAL_SECONDS);
              router.refresh();
            }}
            className="inline-flex items-center justify-center px-8 py-4 bg-foreground text-background text-xs font-semibold tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors"
          >
            Tentar agora
          </button>
        </div>
      </div>
    </div>
  );
}
