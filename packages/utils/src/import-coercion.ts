import { format, isValid, parseISO } from 'date-fns';
import { dollarsToCents } from './currency';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Strict YYYY-MM-DD import date token (calendar-valid only). */
export const tryParseImportIsoDate = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!ISO_DATE_PATTERN.test(trimmed)) return null;

  const date = parseISO(trimmed);
  if (!isValid(date)) return null;

  return format(date, 'yyyy-MM-dd') === trimmed ? trimmed : null;
};

const IMPORT_AMOUNT_TOKEN = /^\$?\s*(\d+|\d{1,3}(,\d{3})+)(\.\d{1,2})?$/;

/**
 * Strict positive import amount token → integer cents.
 * Rejects misplaced currency symbols and grouped amounts inside quoted fields.
 */
export const tryParseImportAmountToCents = (
  value: string | null
): number | null => {
  if (!value) return null;
  const raw = value.trim();
  if (!IMPORT_AMOUNT_TOKEN.test(raw)) return null;

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
