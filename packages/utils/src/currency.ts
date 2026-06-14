const currencyFormatters = new Map<string, Intl.NumberFormat>();
const decimalFormatters = new Map<string, Intl.NumberFormat>();
const localeDecimalSeparators = new Map<
  string,
  { group?: string; decimal: string }
>();

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

/** Rounds dollar amounts to integer cents (sign-aware). */
export const dollarsToCents = (dollars: number): number =>
  Math.sign(dollars) * Math.round(Math.abs(dollars) * 100);

export const centsToDollars = (cents: number): number => cents / 100;

/** Formats integer cents as a localized currency string (e.g. `$1,234.56`). */
export const formatCurrency = (
  cents: number,
  currency = 'CAD',
  locale = 'en-CA'
): string => {
  if (!Number.isFinite(cents)) return '—';
  return getCurrencyFormatter(currency, locale).format(centsToDollars(cents));
};

/** Formats integer cents for editable fields (no currency symbol). */
export const formatCurrencyInput = (
  cents: number,
  locale = 'en-CA'
): string => {
  if (!Number.isFinite(cents)) return '';
  return getDecimalFormatter(locale).format(centsToDollars(cents));
};

const getLocaleDecimalSeparators = (locale: string) => {
  const cached = localeDecimalSeparators.get(locale);
  if (cached) return cached;

  const parts = getDecimalFormatter(locale).formatToParts(1234.5);
  const separators = {
    group: parts.find((part) => part.type === 'group')?.value,
    decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
  };
  localeDecimalSeparators.set(locale, separators);
  return separators;
};

const parseDollarsFromLocalizedString = (
  value: string,
  locale = 'en-CA'
): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const { group, decimal } = getLocaleDecimalSeparators(locale);
  let normalized = trimmed;

  if (group) {
    normalized = normalized.split(group).join('');
  }
  if (decimal !== '.') {
    normalized = normalized.replaceAll(decimal, '.');
  }

  normalized = normalized.replace(/[^\d.-]/g, '');

  if (!/\d/.test(normalized)) return undefined;

  const dollars = Number(normalized);
  if (!Number.isFinite(dollars)) return undefined;

  return dollars;
};

/**
 * Parses a localized currency string and returns **integer cents**.
 * Throws when the input is empty or not a finite number.
 */
export const parseCurrencyInputToCents = (
  value: string,
  locale = 'en-CA'
): number => {
  const dollars = parseDollarsFromLocalizedString(value, locale);
  if (dollars === undefined) {
    if (!value.trim()) {
      throw new Error('Currency input is empty');
    }
    throw new Error('Currency input is not a finite number');
  }
  return dollarsToCents(dollars);
};

/**
 * Decimal edit helpers for focused numeric entry fields.
 *
 * Defaults to `en-CA`: typing uses the locale decimal separator (`.`).
 * Negatives may parse but are not intended for money-entry UIs.
 */

export const sanitizeDecimalEditString = (
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

export const isIncompleteDecimalEdit = (
  sanitized: string,
  locale = 'en-CA'
): boolean => {
  const { decimal } = getLocaleDecimalSeparators(locale);
  return sanitized.length === 0 || sanitized === decimal;
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
  return sanitizeDecimalEditString(cleaned, locale);
};

export const sanitizePercentPaste = (
  text: string,
  locale = 'en-CA'
): string => {
  const cleaned = text.replace(/[\s%]/g, '');
  return sanitizeDecimalEditString(cleaned, locale);
};

export const tryParseDollarsFromEdit = (
  edit: string,
  locale = 'en-CA'
): number | undefined => {
  const sanitized = sanitizeDecimalEditString(edit, locale);
  if (isIncompleteDecimalEdit(sanitized, locale) || !/\d/.test(sanitized)) {
    return undefined;
  }
  return parseDollarsFromLocalizedString(sanitized, locale);
};

/** Formats a dollar amount for blurred currency inputs (no symbol). */
export const formatDollarsBlurDisplay = (
  dollars: number | undefined,
  locale = 'en-CA'
): string => {
  if (dollars === undefined || !Number.isFinite(dollars)) return '';
  return formatCurrencyInput(dollarsToCents(dollars), locale);
};

export const mergeDecimalEditPaste = (
  display: string,
  start: number,
  end: number,
  pasted: string,
  sanitizePaste: (text: string, locale?: string) => string,
  locale = 'en-CA'
): string =>
  sanitizeDecimalEditString(
    display.slice(0, start) +
      sanitizePaste(pasted, locale) +
      display.slice(end),
    locale
  );
