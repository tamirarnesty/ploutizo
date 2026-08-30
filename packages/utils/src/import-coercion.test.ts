import { describe, expect, it } from 'vitest';
import {
  trimApostrophes,
  tryParseImportAmountToCents,
  tryParseImportIsoDate,
} from './import-coercion';

describe('tryParseImportIsoDate', () => {
  it('accepts valid ISO calendar dates', () => {
    expect(tryParseImportIsoDate('2026-05-02')).toBe('2026-05-02');
  });

  it('rejects invalid calendar dates and non-ISO shapes', () => {
    expect(tryParseImportIsoDate('2026-02-30')).toBeNull();
    expect(tryParseImportIsoDate('not-a-date')).toBeNull();
    expect(tryParseImportIsoDate('2026/05/02')).toBeNull();
    expect(tryParseImportIsoDate(null)).toBeNull();
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
