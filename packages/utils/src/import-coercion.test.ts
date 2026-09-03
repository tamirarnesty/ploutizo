import { describe, expect, it } from 'vitest';
import {
  trimApostrophes,
  tryParseImportAmountToCents,
  tryParseImportDayMonthYearDate,
  tryParseImportIsoDate,
  tryParseImportMdyDate,
} from './import-coercion';

describe('import date coercion', () => {
  it.each([
    ['ISO', tryParseImportIsoDate, '2026-05-02', '2026-05-02'],
    ['MM/DD/YYYY', tryParseImportMdyDate, '05/02/2026', '2026-05-02'],
    ['D MMM YYYY', tryParseImportDayMonthYearDate, '2 May 2026', '2026-05-02'],
    ['D MMM YYYY', tryParseImportDayMonthYearDate, '08 May 2026', '2026-05-08'],
  ])('normalizes %s dates', (_format, parseDate, value, expected) => {
    expect(parseDate(value)).toBe(expected);
  });

  it.each([
    ['ISO', tryParseImportIsoDate, '2026-02-30'],
    ['MM/DD/YYYY', tryParseImportMdyDate, '13/40/2026'],
    ['D MMM YYYY', tryParseImportDayMonthYearDate, '32 Foo 2026'],
    ['ISO', tryParseImportIsoDate, '2026/05/02'],
  ])('rejects invalid %s dates', (_format, parseDate, value) => {
    expect(parseDate(value)).toBeNull();
  });
});

describe('tryParseImportAmountToCents', () => {
  it('parses dollar amounts with optional leading currency symbol', () => {
    expect(tryParseImportAmountToCents('42.18')).toBe(4218);
    expect(tryParseImportAmountToCents('$42.18')).toBe(4218);
    expect(tryParseImportAmountToCents('1,234.56')).toBe(123456);
  });

  it('rejects malformed or misplaced currency tokens', () => {
    expect(tryParseImportAmountToCents('12$34.56')).toBeNull();
    expect(tryParseImportAmountToCents('$$42.00')).toBeNull();
    expect(tryParseImportAmountToCents('"12,34.56"')).toBeNull();
    expect(tryParseImportAmountToCents('0')).toBeNull();
    expect(tryParseImportAmountToCents(null)).toBeNull();
  });
});

describe('trimApostrophes', () => {
  it('trims leading and trailing apostrophes', () => {
    expect(trimApostrophes("'AMEX-12345")).toBe('AMEX-12345');
    expect(trimApostrophes("AMEX-12345'")).toBe('AMEX-12345');
    expect(trimApostrophes("'AMEX-12345'")).toBe('AMEX-12345');
    expect(trimApostrophes('AMEX-12345')).toBe('AMEX-12345');
    expect(trimApostrophes("'O'Brien'")).toBe("O'Brien");
  });

  it('returns null for empty values after trimming', () => {
    expect(trimApostrophes(null)).toBeNull();
    expect(trimApostrophes("'")).toBeNull();
    expect(trimApostrophes("''")).toBeNull();
  });
});
