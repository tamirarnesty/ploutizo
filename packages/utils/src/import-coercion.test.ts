import { describe, expect, it } from 'vitest';
import {
  trimApostrophes,
  tryParseImportAmountToCents,
  tryParseImportDate,
} from './import-coercion';

describe('tryParseImportDate', () => {
  it('normalizes approved source date formats to date-only ISO', () => {
    expect(tryParseImportDate('2026-05-02')).toBe('2026-05-02');
    expect(tryParseImportDate('05/02/2026')).toBe('2026-05-02');
    expect(tryParseImportDate('2 May 2026')).toBe('2026-05-02');
    expect(tryParseImportDate('08 May 2026')).toBe('2026-05-08');
  });

  it('rejects invalid calendar dates and unknown shapes', () => {
    expect(tryParseImportDate('2026-02-30')).toBeNull();
    expect(tryParseImportDate('13/40/2026')).toBeNull();
    expect(tryParseImportDate('32 Foo 2026')).toBeNull();
    expect(tryParseImportDate('2026/05/02')).toBeNull();
    expect(tryParseImportDate(null)).toBeNull();
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
