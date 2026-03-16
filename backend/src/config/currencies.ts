export const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_CONFIG: Record<
  SupportedCurrency,
  { symbol: string; locale: string; decimals: number }
> = {
  BRL: { symbol: 'R$', locale: 'pt-BR', decimals: 2 },
  USD: { symbol: '$', locale: 'en-US', decimals: 2 },
  EUR: { symbol: '\u20AC', locale: 'de-DE', decimals: 2 },
};
