/**
 * All monetary operations use CENTS (integers) to avoid floating-point errors.
 * Example: R$ 10.50 is stored as 1050 cents.
 */

export function centsToCurrency(cents: number): number {
  return cents / 100;
}

export function currencyToCents(value: number): number {
  return Math.round(value * 100);
}

export function addCents(a: number, b: number): number {
  return a + b;
}

export function subtractCents(a: number, b: number): number {
  return a - b;
}

export function formatCurrency(
  cents: number,
  locale: string = 'pt-BR',
  currency: string = 'BRL',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(centsToCurrency(cents));
}

export function isValidAmount(cents: number): boolean {
  return Number.isInteger(cents) && cents > 0;
}
