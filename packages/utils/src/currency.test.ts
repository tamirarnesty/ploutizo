import { describe, expect, it } from 'vitest';
import { formatCurrency, parseCurrencyInput } from './currency';

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
});

describe('parseCurrencyInput', () => {
  it('parses common input forms to cents', () => {
    expect(parseCurrencyInput('0')).toBe(0);
    expect(parseCurrencyInput('12')).toBe(1200);
    expect(parseCurrencyInput('12.3')).toBe(1230);
    expect(parseCurrencyInput('12.34')).toBe(1234);
    expect(parseCurrencyInput('$12.34')).toBe(1234);
    expect(parseCurrencyInput(' $ 1,234.56 ')).toBe(123456);
  });

  it('preserves negative input', () => {
    expect(parseCurrencyInput('-12.34')).toBe(-1234);
    expect(parseCurrencyInput('-$12.34')).toBe(-1234);
  });

  it('rounds extra decimal precision to the nearest cent', () => {
    expect(parseCurrencyInput('12.344')).toBe(1234);
    expect(parseCurrencyInput('12.345')).toBe(1235);
    expect(parseCurrencyInput('12.999')).toBe(1300);
  });

  it('throws for blank or invalid input', () => {
    expect(() => parseCurrencyInput('')).toThrow('Invalid currency input');
    expect(() => parseCurrencyInput('   ')).toThrow('Invalid currency input');
    expect(() => parseCurrencyInput('abc')).toThrow('Invalid currency input');
    expect(() => parseCurrencyInput('1.2.3')).toThrow(
      'Invalid currency input'
    );
    expect(() => parseCurrencyInput('1,23')).toThrow(
      'Invalid currency input'
    );
  });
});
