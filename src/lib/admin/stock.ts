import type { StockChangeReason } from '@/lib/types/admin';

export const STOCK_CHANGE_REASON_LABELS: Record<StockChangeReason, string> = {
  RESTOCK: 'Reposição',
  INVENTORY_COUNT: 'Contagem',
  RETURN: 'Devolução',
  DAMAGE: 'Avaria',
  LOSS: 'Perda',
  CORRECTION: 'Correção',
};

export function translateStockChangeReason(reason: StockChangeReason): string {
  return STOCK_CHANGE_REASON_LABELS[reason];
}
