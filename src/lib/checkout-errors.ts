import type { CartItem } from "@/lib/cart-storage";

const SKU_CODE_PATTERN = /SKU:\s*([A-Za-z0-9_-]+)/;

export interface OutOfStockProblem {
  detail?: unknown;
  availableQuantity?: unknown;
  skuId?: unknown;
}

export function describeCartItem(item: CartItem): string {
  return `${item.name} (${item.colorName}, tam. ${item.size})`;
}

export function findProblemItem(
  problem: OutOfStockProblem,
  items: CartItem[],
): CartItem | null {
  if (typeof problem.skuId === "number") {
    const bySkuId = items.find((item) => item.skuId === problem.skuId);
    if (bySkuId) return bySkuId;
  }

  if (typeof problem.detail === "string") {
    const code = SKU_CODE_PATTERN.exec(problem.detail)?.[1];
    if (code) {
      const bySkuCode = items.find((item) => item.skuCode === code);
      if (bySkuCode) return bySkuCode;
    }
  }

  return null;
}

export function outOfStockMessage(
  problem: OutOfStockProblem,
  items: CartItem[],
): string {
  const item = findProblemItem(problem, items);
  const available =
    typeof problem.availableQuantity === "number" ? problem.availableQuantity : 0;

  if (!item) {
    return available > 0
      ? "Um dos itens do seu carrinho não tem mais a quantidade pedida. Volte ao carrinho para ajustá-la."
      : "Um dos itens do seu carrinho não está mais disponível. Volte ao carrinho para removê-lo.";
  }

  const description = describeCartItem(item);

  if (available <= 0) {
    return `${description} ficou sem estoque. Volte ao carrinho para remover o item.`;
  }

  return available === 1
    ? `Só restou 1 unidade de ${description}. Volte ao carrinho para ajustar a quantidade.`
    : `Só restaram ${available} unidades de ${description}. Volte ao carrinho para ajustar a quantidade.`;
}
