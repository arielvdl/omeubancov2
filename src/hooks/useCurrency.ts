import { useSettingsStore } from '@/src/stores/useSettingsStore';
import { formatCurrency } from '@/src/utils/currency';

export function useCurrency() {
  const locale = useSettingsStore((s) => s.locale);
  const currency = useSettingsStore((s) => s.currency);

  return {
    format: (cents: number) => formatCurrency(cents, locale, currency),
    locale,
    currency,
  };
}
