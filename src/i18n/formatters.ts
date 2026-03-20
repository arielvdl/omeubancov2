function safeDate(date: string | Date): Date | null {
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(date: string | Date, locale: string = 'pt-BR'): string {
  const d = safeDate(date);
  if (!d) return '-';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatTime(date: string | Date, locale: string = 'pt-BR'): string {
  const d = safeDate(date);
  if (!d) return '-';
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatRelativeDate(date: string | Date, locale: string = 'pt-BR'): string {
  const now = new Date();
  const target = safeDate(date);
  if (!target) return '-';
  const diffMs = now.getTime() - target.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    try {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      return capitalize(rtf.format(-diffDays, 'day'));
    } catch {
      // fallback if Intl.RelativeTimeFormat not available
      if (diffDays === 0) return locale.startsWith('pt') ? 'Hoje' : 'Today';
      if (diffDays === 1) return locale.startsWith('pt') ? 'Ontem' : 'Yesterday';
      return locale.startsWith('pt')
        ? `${diffDays} dias atrás`
        : `${diffDays} days ago`;
    }
  }
  return formatDate(date, locale);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
