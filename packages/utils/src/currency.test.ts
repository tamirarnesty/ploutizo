import { describe, expect, it } from 'vitest';
import {
  centsToDollars,
  dollarsToCents,
  formatCurrency,
  formatCurrencyBlurDisplay,
  formatCurrencyInput,
  mergeCurrencyEditPaste,
  parseCurrencyInput,
  sanitizeCurrencyEditString,
  sanitizeCurrencyPaste,
  tryParseDollarsFromEdit,
} from './currency';

describe('formatCurrency', () => {
  it('formats zero cents', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats positive cents', () => {
    expect(formatCurrency(23_480)).toBe('$234.80');
  });

  it('formats negative cents', () => {
    expect(formatCurrency(-23_480)).toBe('-$234.80');
  });

  it('formats large values with grouping', () => {
    expect(formatCurrency(123_456_789)).toBe('$1,234,567.89');
  });

  it('returns em dash for non-finite cents', () => {
    expect(formatCurrency(Number.NaN)).toBe('—');
    expect(formatCurrency(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('formatCurrencyInput', () => {
  it('formats cents for editable currency fields', () => {
    expect(formatCurrencyInput(0)).toBe('0.00');
    expect(formatCurrencyInput(123_456)).toBe('1,234.56');
    expect(formatCurrencyInput(-123_456)).toBe('-1,234.56');
  });

  it('returns empty string for non-finite cents', () => {
    expect(formatCurrencyInput(Number.NaN)).toBe('');
    expect(formatCurrencyInput(Number.POSITIVE_INFINITY)).toBe('');
  });
});

describe('dollarsToCents', () => {
  it('rounds numeric dollar values to cents', () => {
    expect(dollarsToCents(12)).toBe(1200);
    expect(dollarsToCents(12.345)).toBe(1235);
    expect(centsToDollars(1235)).toBe(12.35);
  });
});

describe('parseCurrencyInput', () => {
  it('parses localized decimal strings to rounded cents', () => {
    expect(parseCurrencyInput('12.34')).toBe(1234);
    expect(parseCurrencyInput('1,234.56')).toBe(123_456);
    expect(parseCurrencyInput('12.345')).toBe(1235);
  });

  it('preserves and rounds negative values', () => {
    expect(parseCurrencyInput('-12.34')).toBe(-1234);
    expect(parseCurrencyInput('-1,234.56')).toBe(-123_456);
    expect(parseCurrencyInput('-12.345')).toBe(-1235);
  });

  it('throws on empty or non-finite input', () => {
    expect(() => parseCurrencyInput('')).toThrow('Currency input is empty');
    expect(() => parseCurrencyInput('   ')).toThrow('Currency input is empty');
    expect(() => parseCurrencyInput('abc')).toThrow(
      'Currency input is not a finite number'
    );
  });
});

describe('sanitizeCurrencyEditString', () => {
  it('keeps digits and one decimal separator', () => {
    expect(sanitizeCurrencyEditString('12abc34.56.7')).toBe('1234.567');
    expect(sanitizeCurrencyEditString('.')).toBe('.');
  });
});

describe('sanitizeCurrencyPaste', () => {
  it('strips currency symbols, whitespace, and grouping', () => {
    expect(sanitizeCurrencyPaste('$ 1,234.56')).toBe('1234.56');
  });
});

describe('tryParseDollarsFromEdit', () => {
  it('returns undefined for partial edit states', () => {
    expect(tryParseDollarsFromEdit('')).toBeUndefined();
    expect(tryParseDollarsFromEdit('.')).toBeUndefined();
    expect(tryParseDollarsFromEdit('abc')).toBeUndefined();
  });

  it('parses without rounding mid-edit', () => {
    expect(tryParseDollarsFromEdit('12.345')).toBe(12.345);
    expect(tryParseDollarsFromEdit('.12')).toBe(0.12);
  });
});

describe('formatCurrencyBlurDisplay', () => {
  it('formats finite dollars and empty for undefined', () => {
    expect(formatCurrencyBlurDisplay(undefined)).toBe('');
    expect(formatCurrencyBlurDisplay(1234.56)).toBe('1,234.56');
  });
});

describe('mergeCurrencyEditPaste', () => {
  it('merges paste into edit display at selection', () => {
    expect(mergeCurrencyEditPaste('12', 2, 2, '.34')).toBe('12.34');
    expect(mergeCurrencyEditPaste('100', 0, 3, '$ 50.00')).toBe('50.00');
  });
});
