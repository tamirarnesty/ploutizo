import { describe, expect, it } from 'vitest';
import {
  centsToDollars,
  dollarsToCents,
  formatCurrency,
  formatDollarsBlurDisplay,
  formatCurrencyInput,
  formatPercentBlurDisplay,
  getCurrencySymbol,
  isIncompleteDecimalEdit,
  mergeDecimalEditPaste,
  parseCurrencyInputToCents,
  roundPercentToOneDecimal,
  sanitizeDecimalEditString,
  sanitizeCurrencyPaste,
  sanitizePercentPaste,
  tryParseDollarsFromEdit,
  tryParsePercentFromEdit,
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

  it('formats whole dollars when fraction digits are zero', () => {
    expect(
      formatCurrency(5000, 'CAD', 'en-CA', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    ).toBe('$50');
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

  it('documents JS floating-point half-cent limitation', () => {
    expect(dollarsToCents(1.005)).toBe(100);
  });
});

describe('parseCurrencyInputToCents', () => {
  it('parses localized decimal strings to rounded cents', () => {
    expect(parseCurrencyInputToCents('12.34')).toBe(1234);
    expect(parseCurrencyInputToCents('1,234.56')).toBe(123_456);
    expect(parseCurrencyInputToCents('12.345')).toBe(1235);
  });

  it('preserves and rounds negative values', () => {
    expect(parseCurrencyInputToCents('-12.34')).toBe(-1234);
    expect(parseCurrencyInputToCents('-1,234.56')).toBe(-123_456);
    expect(parseCurrencyInputToCents('-12.345')).toBe(-1235);
  });

  it('throws on empty or non-finite input', () => {
    expect(() => parseCurrencyInputToCents('')).toThrow(
      'Currency input is empty'
    );
    expect(() => parseCurrencyInputToCents('   ')).toThrow(
      'Currency input is empty'
    );
    expect(() => parseCurrencyInputToCents('abc')).toThrow(
      'Currency input is not a finite number'
    );
  });
});

describe('sanitizeDecimalEditString', () => {
  it('keeps digits and one decimal separator', () => {
    expect(sanitizeDecimalEditString('12abc34.56.7')).toBe('1234.567');
    expect(sanitizeDecimalEditString('.')).toBe('.');
  });

  it('keeps the locale decimal separator', () => {
    expect(sanitizeDecimalEditString(',', 'fr-CA')).toBe(',');
  });
});

describe('isIncompleteDecimalEdit', () => {
  it('recognizes empty and locale decimal separator edits', () => {
    expect(isIncompleteDecimalEdit('')).toBe(true);
    expect(isIncompleteDecimalEdit('.')).toBe(true);
    expect(isIncompleteDecimalEdit(',', 'fr-CA')).toBe(true);
    expect(isIncompleteDecimalEdit('1', 'fr-CA')).toBe(false);
  });
});

describe('sanitizeCurrencyPaste', () => {
  it('strips currency symbols, whitespace, and grouping', () => {
    expect(sanitizeCurrencyPaste('$ 1,234.56')).toBe('1234.56');
  });
});

describe('sanitizePercentPaste', () => {
  it('strips percent signs and whitespace', () => {
    expect(sanitizePercentPaste(' 50% ')).toBe('50');
    expect(sanitizePercentPaste('33.3%')).toBe('33.3');
  });
});

describe('tryParseDollarsFromEdit', () => {
  it('returns undefined for partial edit states', () => {
    expect(tryParseDollarsFromEdit('')).toBeUndefined();
    expect(tryParseDollarsFromEdit('.')).toBeUndefined();
    expect(tryParseDollarsFromEdit(',', 'fr-CA')).toBeUndefined();
    expect(tryParseDollarsFromEdit('abc')).toBeUndefined();
  });

  it('parses without rounding mid-edit', () => {
    expect(tryParseDollarsFromEdit('12.345')).toBe(12.345);
    expect(tryParseDollarsFromEdit('.12')).toBe(0.12);
  });
});

describe('formatDollarsBlurDisplay', () => {
  it('formats finite dollars and empty for undefined', () => {
    expect(formatDollarsBlurDisplay(undefined)).toBe('');
    expect(formatDollarsBlurDisplay(1234.56)).toBe('1,234.56');
  });
});

describe('mergeDecimalEditPaste', () => {
  it('merges currency paste into edit display at selection', () => {
    expect(
      mergeDecimalEditPaste('12', 2, 2, '.34', sanitizeCurrencyPaste)
    ).toBe('12.34');
    expect(
      mergeDecimalEditPaste('100', 0, 3, '$ 50.00', sanitizeCurrencyPaste)
    ).toBe('50.00');
  });

  it('merges percent paste into edit display', () => {
    expect(mergeDecimalEditPaste('12', 2, 2, '.5%', sanitizePercentPaste)).toBe(
      '12.5'
    );
    expect(mergeDecimalEditPaste('', 0, 0, ' 40% ', sanitizePercentPaste)).toBe(
      '40'
    );
  });
});

describe('getCurrencySymbol', () => {
  it('returns the currency symbol for en-CA CAD', () => {
    expect(getCurrencySymbol('en-CA', 'CAD')).toBe('$');
  });
});

describe('tryParsePercentFromEdit', () => {
  it('parses locale-aware percent edits', () => {
    expect(tryParsePercentFromEdit('60.5')).toBe(60.5);
    expect(tryParsePercentFromEdit('60,5', 'fr-CA')).toBe(60.5);
  });

  it('returns undefined for incomplete edits', () => {
    expect(tryParsePercentFromEdit('')).toBeUndefined();
    expect(tryParsePercentFromEdit(',', 'fr-CA')).toBeUndefined();
  });
});

describe('formatPercentBlurDisplay', () => {
  it('formats percent with one decimal using locale', () => {
    expect(formatPercentBlurDisplay(60.5)).toBe('60.5');
    expect(formatPercentBlurDisplay(60.5, 'fr-CA')).toBe('60,5');
  });
});

describe('roundPercentToOneDecimal', () => {
  it('rounds to one decimal place', () => {
    expect(roundPercentToOneDecimal(33.333)).toBe(33.3);
  });
});
