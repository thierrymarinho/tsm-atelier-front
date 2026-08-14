export const POSTAL_CODE_DIGITS = 8;

export const POSTAL_CODE_HINT = "CEP inválido. Use o formato 00000-000 ou 00000000.";

export function maskPostalCode(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, POSTAL_CODE_DIGITS);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function isCompletePostalCode(value: string): boolean {
  return value.replace(/\D/g, "").length === POSTAL_CODE_DIGITS;
}
