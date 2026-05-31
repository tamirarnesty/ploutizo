import { describe, expect, it } from 'vitest';
import {
  colourTokenSchema,
  parseColourToken,
} from './colour-tokens';

describe('parseColourToken', () => {
  it('returns token for valid value', () => {
    expect(parseColourToken('green-500')).toBe('green-500');
  });

  it('returns null for hex legacy values', () => {
    expect(parseColourToken('#f00')).toBeNull();
  });

  it('returns null for null, undefined, and empty string', () => {
    expect(parseColourToken(null)).toBeNull();
    expect(parseColourToken(undefined)).toBeNull();
    expect(parseColourToken('')).toBeNull();
  });

  it('returns null for unknown strings', () => {
    expect(parseColourToken('not-a-token')).toBeNull();
  });
});

describe('colourTokenSchema', () => {
  it('accepts valid tokens', () => {
    expect(colourTokenSchema.safeParse('red-500').success).toBe(true);
  });

  it('rejects invalid strings', () => {
    expect(colourTokenSchema.safeParse('#f00').success).toBe(false);
    expect(colourTokenSchema.safeParse('bogus').success).toBe(false);
  });
});
