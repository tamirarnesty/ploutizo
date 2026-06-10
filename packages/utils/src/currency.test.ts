import { describe, expect, it } from 'vitest';
import {
  centsToDollars,
  dollarsToCents,
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
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

  it('throws on empty or non-finite input', () => {
    expect(() => parseCurrencyInput('')).toThrow('Currency input is empty');
    expect(() => parseCurrencyInput('   ')).toThrow('Currency input is empty');
    expect(() => parseCurrencyInput('abc')).toThrow(
      'Currency input is not a finite number'
    );
  });
});
