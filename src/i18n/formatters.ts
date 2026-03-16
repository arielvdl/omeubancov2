export function formatDate(date: string | Date, locale: string = 'pt-BR'): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatTime(date: string | Date, locale: string = 'pt-BR'): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeDate(date: string | Date, locale: string = 'pt-BR'): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return locale.startsWith('pt') ? 'Hoje' : 'Today';
  if (diffDays === 1) return locale.startsWith('pt') ? 'Ontem' : 'Yesterday';
  if (diffDays < 7) {
    return locale.startsWith('pt')
      ? `${diffDays} dias atras`
      : `${diffDays} days ago`;
  }
  return formatDate(date, locale);
}

export function formatCurrencyValue(
  cents: number,
  locale: string = 'pt-BR',
  currency: string = 'BRL',
): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    cents / 100,
  );
}
