const currencyFormatters = new Map<string, Intl.NumberFormat>();
const decimalFormatters = new Map<string, Intl.NumberFormat>();

const getCurrencyFormatter = (
  currency: string,
  locale: string
): Intl.NumberFormat => {
  const key = `${locale}:${currency}`;
  const cached = currencyFormatters.get(key);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  });
  currencyFormatters.set(key, formatter);
  return formatter;
};

const getDecimalFormatter = (locale: string): Intl.NumberFormat => {
  const cached = decimalFormatters.get(locale);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  decimalFormatters.set(locale, formatter);
  return formatter;
};

export const dollarsToCents = (dollars: number): number =>
  Math.round(dollars * 100);

export const centsToDollars = (cents: number): number => cents / 100;

export const formatCurrency = (
  cents: number,
  currency = 'CAD',
  locale = 'en-CA'
): string => {
  if (!Number.isFinite(cents)) return '—';
  return getCurrencyFormatter(currency, locale).format(centsToDollars(cents));
};

export const formatCurrencyInput = (
  cents: number,
  locale = 'en-CA'
): string => {
  if (!Number.isFinite(cents)) return '';
  return getDecimalFormatter(locale).format(centsToDollars(cents));
};

const getLocaleDecimalSeparators = (locale: string) => {
  const parts = getDecimalFormatter(locale).formatToParts(1234.5);
  return {
    group: parts.find((part) => part.type === 'group')?.value,
    decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
  };
};

export const parseCurrencyInput = (value: string, locale = 'en-CA'): number => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Currency input is empty');
  }

  const { group, decimal } = getLocaleDecimalSeparators(locale);
  let normalized = trimmed;

  if (group) {
    normalized = normalized.split(group).join('');
  }
  if (decimal !== '.') {
    normalized = normalized.replaceAll(decimal, '.');
  }

  normalized = normalized.replace(/[^\d.-]/g, '');

  if (!/\d/.test(normalized)) {
    throw new Error('Currency input is not a finite number');
  }

  const dollars = Number(normalized);
  if (!Number.isFinite(dollars)) {
    throw new Error('Currency input is not a finite number');
  }

  return dollarsToCents(dollars);
};
