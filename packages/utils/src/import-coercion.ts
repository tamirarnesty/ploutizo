import { format, isValid, parse, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { dollarsToCents } from './currency';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MDY_DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;
const DMY_DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;
const DAY_MONTH_YEAR_PATTERN = /^\d{1,2} [A-Za-z]{3} \d{4}$/;
const PARSE_REFERENCE_DATE = new Date(Date.UTC(2000, 0, 1));

const toIsoCalendarDate = (date: Date): string | null => {
  if (!isValid(date)) return null;
  return format(date, 'yyyy-MM-dd');
};

/** Strict YYYY-MM-DD import date token (calendar-valid only). */
export const tryParseImportIsoDate = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!ISO_DATE_PATTERN.test(trimmed)) return null;

  const date = parseISO(trimmed);
  const iso = toIsoCalendarDate(date);
  return iso === trimmed ? iso : null;
};

/** Strict MM/DD/YYYY import date token (calendar-valid only). */
export const tryParseImportMdyDate = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!MDY_DATE_PATTERN.test(trimmed)) return null;

  const date = parse(trimmed, 'MM/dd/yyyy', PARSE_REFERENCE_DATE);
  if (!isValid(date) || format(date, 'MM/dd/yyyy') !== trimmed) return null;
  return toIsoCalendarDate(date);
};

/** Strict `D MMM YYYY` import date token (day may be one or two digits). */
export const tryParseImportDayMonthYearDate = (
  value: string | null
): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!DAY_MONTH_YEAR_PATTERN.test(trimmed)) return null;

  const date = parse(trimmed, 'd MMM yyyy', PARSE_REFERENCE_DATE, {
    locale: enUS,
  });
  if (!isValid(date)) return null;
  const normalized = trimmed.toLowerCase();
  const unpadded = format(date, 'd MMM yyyy', { locale: enUS }).toLowerCase();
  const padded = format(date, 'dd MMM yyyy', { locale: enUS }).toLowerCase();
  if (unpadded !== normalized && padded !== normalized) return null;
  return toIsoCalendarDate(date);
};

/** Strict DD/MM/YYYY import date token (calendar-valid only). */
export const tryParseImportDmyDate = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!DMY_DATE_PATTERN.test(trimmed)) return null;

  const date = parse(trimmed, 'dd/MM/yyyy', PARSE_REFERENCE_DATE);
  if (!isValid(date) || format(date, 'dd/MM/yyyy') !== trimmed) return null;
  return toIsoCalendarDate(date);
};

/** True when the token has YYYY-MM-DD shape, even if the calendar date is invalid. */
export const looksLikeImportIsoDate = (value: string | null): boolean =>
  value != null && ISO_DATE_PATTERN.test(value.trim());

/** True when the token has MM/DD/YYYY shape, even if the calendar date is invalid. */
export const looksLikeImportMdyDate = (value: string | null): boolean =>
  value != null && MDY_DATE_PATTERN.test(value.trim());

/** True when the token has `D MMM YYYY` shape, even if the calendar date is invalid. */
export const looksLikeImportDayMonthYearDate = (
  value: string | null
): boolean => value != null && DAY_MONTH_YEAR_PATTERN.test(value.trim());

const IMPORT_AMOUNT_TOKEN = /^\$?\s*(\d+|\d{1,3}(,\d{3})+)(\.\d{1,2})?$/;

/** True when the value is a strict unsigned import amount token, including zero. */
export const isImportAmountToken = (value: string | null): boolean =>
  value != null && IMPORT_AMOUNT_TOKEN.test(value.trim());

/**
 * Strict positive import amount token → integer cents.
 * Rejects misplaced currency symbols and grouped amounts inside quoted fields.
 */
export const tryParseImportAmountToCents = (
  value: string | null
): number | null => {
  if (!value || !isImportAmountToken(value)) return null;
  const raw = value.trim();

  const normalized = raw.replace(/^\$\s*/, '').replace(/,/g, '');
  const dollars = Number(normalized);
  if (!Number.isFinite(dollars) || dollars <= 0) return null;

  const cents = dollarsToCents(dollars);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
};

/** Trim leading and trailing apostrophes from spreadsheet text cells. */
export const trimApostrophes = (value: string | null): string | null => {
  if (value == null) return null;
  const trimmed = value.replace(/^'+|(?<!')'+$/g, '');
  return trimmed.length > 0 ? trimmed : null;
};
