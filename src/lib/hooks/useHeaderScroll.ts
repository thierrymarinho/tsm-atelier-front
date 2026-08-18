"use client";

import { useEffect, useRef, useState } from "react";

// Uma rolagem menor que isto é tremor de trackpad, não intenção de direção.
// Sem a folga, o header pisca a cada micro-ajuste do dedo.
const DIRECTION_THRESHOLD_PX = 8;

// Só permite esconder depois de a página ter passado da altura do header
// (4rem no mobile, 5rem acima disso). Sem este piso, o primeiro toque de
// rolagem no topo já faria o header sair e voltar.
const HIDE_AFTER_PX = 96;

interface HeaderScrollOptions {
  /** A rota atual permite que o header saia da tela ao rolar para baixo. */
  canHide: boolean;
  /** Algo aberto pendurado no header — menu, carrinho, painel de login. */
  pinned: boolean;
  /** Rolagem em px até onde o header é transparente. `null` = nunca. */
  transparentUntil: number | null;
}

interface HeaderScrollState {
  isHidden: boolean;
  /** A página já rolou além da faixa transparente desta rota. */
  isPastTransparency: boolean;
}

/**
 * Estado de rolagem do header, em booleanos.
 *
 * Devolve booleanos e não o `scrollY` cru de propósito: o header re-renderiza
 * só quando um estado vira, e não a cada evento de rolagem.
 */
export function useHeaderScroll({
  canHide,
  pinned,
  transparentUntil,
}: HeaderScrollOptions): HeaderScrollState {
  const [isHidden, setIsHidden] = useState(false);
  const [isPastTransparency, setIsPastTransparency] = useState(transparentUntil === null);

  const lastYRef = useRef(0);
  const wantsHiddenRef = useRef(false);

  useEffect(() => {
    const read = () => {
      // O bounce elástico do iOS produz scrollY negativo. Tratar como topo.
      const y = Math.max(0, window.scrollY);
      const delta = y - lastYRef.current;

      if (Math.abs(delta) > DIRECTION_THRESHOLD_PX) {
        lastYRef.current = y;
        wantsHiddenRef.current = delta > 0;
      }

      setIsHidden(canHide && !pinned && y > HIDE_AFTER_PX && wantsHiddenRef.current);
      setIsPastTransparency(transparentUntil === null || y > transparentUntil);
    };

    read();

    window.addEventListener("scroll", read, { passive: true });
    return () => window.removeEventListener("scroll", read);
  }, [canHide, pinned, transparentUntil]);

  return { isHidden, isPastTransparency };
}
