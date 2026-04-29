import { DEFAULT_APP_CONFIG } from '@/config/app.config';

export function formatCurrency(pesewas: number): string {
  const ghs = pesewas / 100;
  return new Intl.NumberFormat(DEFAULT_APP_CONFIG.currencyLocale, {
    style: 'currency',
    currency: DEFAULT_APP_CONFIG.currency,
    minimumFractionDigits: 2,
  }).format(ghs);
}

export function formatCurrencyCompact(pesewas: number): string {
  const ghs = pesewas / 100;
  return `${DEFAULT_APP_CONFIG.currency} ${ghs.toLocaleString(DEFAULT_APP_CONFIG.currencyLocale, { minimumFractionDigits: 2 })}`;
}

export function ghsToPesewas(ghs: number): number {
  return Math.round(ghs * 100);
}

export function pesewasToGhs(pesewas: number): number {
  return pesewas / 100;
}
