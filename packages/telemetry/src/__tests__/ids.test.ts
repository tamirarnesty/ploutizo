import { describe, expect, it } from 'vitest';
import {
  createCorrelationId,
  isValidCorrelationId,
  parseCorrelationId,
  resolveCorrelationId,
} from '../ids';

describe('correlation IDs', () => {
  it('creates UUIDv4 correlation IDs', () => {
    const first = createCorrelationId();
    const second = createCorrelationId();

    expect(isValidCorrelationId(first)).toBe(true);
    expect(isValidCorrelationId(second)).toBe(true);
    expect(first).not.toBe(second);
  });

  it('validates and parses correlation IDs', () => {
    const valid = '550e8400-e29b-41d4-a716-446655440000';
    expect(isValidCorrelationId(valid)).toBe(true);
    expect(parseCorrelationId(` ${valid} `)).toBe(valid);

    expect(isValidCorrelationId('not-a-uuid')).toBe(false);
    expect(isValidCorrelationId('550e8400-e29b-11d4-a716-446655440000')).toBe(
      false
    ); // not version 4
    expect(parseCorrelationId(null)).toBeNull();
    expect(parseCorrelationId(123)).toBeNull();
    expect(parseCorrelationId('')).toBeNull();
  });

  it('resolveCorrelationId accepts valid IDs and replaces invalid ones', () => {
    const valid = createCorrelationId();
    expect(resolveCorrelationId(valid)).toBe(valid);

    const generated = resolveCorrelationId('bad-id', () => valid);
    expect(generated).toBe(valid);
  });
});
