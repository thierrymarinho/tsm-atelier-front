export const formatBRL = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

function parseServerDateTime(value: string): Date | null {
  const truncated = value.replace(/(\.\d{3})\d+$/, '$1');
  const parsed = new Date(truncated);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export const formatServerDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const date = parseServerDateTime(value);
  if (!date) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const formatServerDateTime = (value: string | null | undefined): string => {
  if (!value) return '—';
  const date = parseServerDateTime(value);
  if (!date) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};
