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
  Math.sign(dollars) * Math.round(Math.abs(dollars) * 100);

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

/**
 * Currency edit helpers for focused money-entry fields.
 *
 * Scoped to `en-CA` / CAD: typing uses the locale decimal separator (`.`).
 * Negatives may parse but are not intended for money-entry UIs.
 */

export const sanitizeCurrencyEditString = (
  input: string,
  locale = 'en-CA'
): string => {
  const { decimal } = getLocaleDecimalSeparators(locale);
  let result = '';
  let hasDecimal = false;
  for (const char of input) {
    if (char >= '0' && char <= '9') {
      result += char;
    } else if (char === decimal && !hasDecimal) {
      hasDecimal = true;
      result += char;
    }
  }
  return result;
};

export const sanitizeCurrencyPaste = (
  text: string,
  locale = 'en-CA'
): string => {
  const { group } = getLocaleDecimalSeparators(locale);
  let cleaned = text.replace(/[\s$]/g, '');
  if (group) {
    cleaned = cleaned.split(group).join('');
  }
  return sanitizeCurrencyEditString(cleaned, locale);
};

export const tryParseDollarsFromEdit = (
  edit: string,
  locale = 'en-CA'
): number | undefined => {
  const sanitized = sanitizeCurrencyEditString(edit, locale);
  if (!sanitized || sanitized === '.' || !/\d/.test(sanitized)) {
    return undefined;
  }

  const { decimal } = getLocaleDecimalSeparators(locale);
  let normalized = sanitized;
  if (decimal !== '.') {
    normalized = normalized.replaceAll(decimal, '.');
  }
  normalized = normalized.replace(/[^\d.-]/g, '');

  const dollars = Number(normalized);
  if (!Number.isFinite(dollars)) {
    return undefined;
  }
  return dollars;
};

export const formatCurrencyBlurDisplay = (
  dollars: number | undefined,
  locale = 'en-CA'
): string => {
  if (dollars === undefined || !Number.isFinite(dollars)) return '';
  return formatCurrencyInput(dollarsToCents(dollars), locale);
};

export const mergeCurrencyEditPaste = (
  display: string,
  start: number,
  end: number,
  pasted: string,
  locale = 'en-CA'
): string =>
  sanitizeCurrencyEditString(
    display.slice(0, start) +
      sanitizeCurrencyPaste(pasted, locale) +
      display.slice(end),
    locale
  );
