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
): string =>
  getCurrencyFormatter(currency, locale).format(centsToDollars(cents));

export const formatCurrencyInput = (cents: number, locale = 'en-CA'): string =>
  getDecimalFormatter(locale).format(centsToDollars(cents));
