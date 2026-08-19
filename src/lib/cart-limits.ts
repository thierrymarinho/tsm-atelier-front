export const MAX_UNITS_PER_ITEM = 10;

export type CapNotice = {
  text: string;
  tone: "neutral" | "warning";
};

export function maxUnitsFor(stockQuantity: number): number {
  return Math.min(MAX_UNITS_PER_ITEM, stockQuantity);
}

export function capNotice(stockQuantity: number): CapNotice | null {
  if (stockQuantity <= 0) return null;

  if (stockQuantity >= MAX_UNITS_PER_ITEM) {
    return {
      text: `Máximo de ${MAX_UNITS_PER_ITEM} unidades por pedido.`,
      tone: "neutral",
    };
  }

  return {
    text:
      stockQuantity === 1
        ? "Última unidade disponível."
        : `Últimas ${stockQuantity} unidades disponíveis.`,
    tone: "warning",
  };
}

export function limitMessage(availableQuantity: number): string {
  if (availableQuantity >= MAX_UNITS_PER_ITEM) {
    return `Máximo de ${MAX_UNITS_PER_ITEM} unidades por pedido.`;
  }
  if (availableQuantity === 1) {
    return "Só resta 1 unidade deste produto no momento.";
  }
  return `Só temos ${availableQuantity} unidades deste produto no momento.`;
}
