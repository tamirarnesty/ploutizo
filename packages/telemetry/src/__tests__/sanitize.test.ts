import { describe, expect, it } from 'vitest';
import {
  REDACTED,
  SANITIZE_MAX_DEPTH,
  TRUNCATED,
  isProhibitedAttributeKey,
  sanitizeAttributes,
} from '../sanitize';

describe('sanitizeAttributes', () => {
  it('redacts credentials, tokens, and authorization keys', () => {
    const { attributes, redactedKeys } = sanitizeAttributes({
      password: 'hunter2',
      accessToken: 'secret-token',
      authorization: 'Bearer abc',
      api_key: 'k',
      cookie: 'session=1',
      safeFlag: true,
    });

    expect(attributes.password).toBe(REDACTED);
    expect(attributes.accessToken).toBe(REDACTED);
    expect(attributes.authorization).toBe(REDACTED);
    expect(attributes.api_key).toBe(REDACTED);
    expect(attributes.cookie).toBe(REDACTED);
    expect(attributes.safeFlag).toBe(true);
    expect(redactedKeys).toEqual(
      expect.arrayContaining([
        'password',
        'accessToken',
        'authorization',
        'api_key',
        'cookie',
      ])
    );
  });

  it('redacts raw request data, financial values, and import contents', () => {
    const { attributes } = sanitizeAttributes({
      body: { nested: true },
      payload: 'raw',
      headers: { Authorization: 'x' },
      amount: 1200,
      amountCents: 1200,
      balance: 50,
      csv: 'a,b,c',
      rows: [{ description: 'coffee' }],
      upload: 'file-bytes',
      outcome: 'success',
    });

    expect(attributes.body).toBe(REDACTED);
    expect(attributes.payload).toBe(REDACTED);
    expect(attributes.headers).toBe(REDACTED);
    expect(attributes.amount).toBe(REDACTED);
    expect(attributes.amountCents).toBe(REDACTED);
    expect(attributes.balance).toBe(REDACTED);
    expect(attributes.csv).toBe(REDACTED);
    expect(attributes.rows).toBe(REDACTED);
    expect(attributes.upload).toBe(REDACTED);
    expect(attributes.outcome).toBe('success');
  });

  it('redacts entity identifiers and user-entered text keys', () => {
    const { attributes } = sanitizeAttributes({
      accountId: '550e8400-e29b-41d4-a716-446655440000',
      transaction_id: '550e8400-e29b-41d4-a716-446655440001',
      description: 'Coffee shop',
      notes: 'personal note',
      email: 'user@example.com',
      name: 'Checking',
      method: 'GET',
      valid: true,
    });

    expect(attributes.accountId).toBe(REDACTED);
    expect(attributes.transaction_id).toBe(REDACTED);
    expect(attributes.description).toBe(REDACTED);
    expect(attributes.notes).toBe(REDACTED);
    expect(attributes.email).toBe(REDACTED);
    expect(attributes.name).toBe(REDACTED);
    expect(attributes.method).toBe('GET');
    expect(attributes.valid).toBe(true);
  });

  it('redacts sensitive-looking string values even under safe keys', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.signature';
    const { attributes, redactedKeys } = sanitizeAttributes({
      detail: jwt,
      hint: 'Bearer abc.def.ghi',
    });

    expect(attributes.detail).toBe(REDACTED);
    expect(attributes.hint).toBe(REDACTED);
    expect(redactedKeys.length).toBeGreaterThan(0);
  });

  it('bounds object depth and truncates deep nests', () => {
    const deep = { a: { b: { c: { d: { e: { f: 'too-deep' } } } } } };
    const { attributes } = sanitizeAttributes(deep, {
      maxDepth: SANITIZE_MAX_DEPTH,
    });

    // Depth beyond max should omit rather than leak nested content.
    const serialized = JSON.stringify(attributes);
    expect(serialized).not.toContain('too-deep');
  });

  it('bounds key count and string length', () => {
    const manyKeys: Record<string, string> = {};
    for (let i = 0; i < 50; i += 1) {
      manyKeys[`key${i}`] = 'x'.repeat(10);
    }

    const { attributes, truncated } = sanitizeAttributes(manyKeys, {
      maxKeys: 5,
      maxStringLength: 8,
    });

    expect(Object.keys(attributes).length).toBeLessThanOrEqual(6); // keys + marker
    expect(truncated).toBe(true);
    expect(String(attributes.key0)).toContain(TRUNCATED);
  });

  it('bounds total serialized size', () => {
    const bulky: Record<string, string> = {};
    for (let i = 0; i < 30; i += 1) {
      bulky[`field${i}`] = 'y'.repeat(180);
    }

    const { attributes, truncated } = sanitizeAttributes(bulky, {
      maxTotalBytes: 200,
      maxKeys: 32,
    });

    expect(truncated).toBe(true);
    expect(attributes._truncated).toBe(TRUNCATED);
  });

  it('never throws on malformed input', () => {
    expect(() => sanitizeAttributes(undefined)).not.toThrow();
    expect(() => sanitizeAttributes(null)).not.toThrow();
    expect(() => sanitizeAttributes('plain')).not.toThrow();
    expect(() => sanitizeAttributes([1, 2, 3])).not.toThrow();
    expect(sanitizeAttributes(undefined).attributes).toEqual({});
  });

  it('exposes prohibited-key helper for callers', () => {
    expect(isProhibitedAttributeKey('password')).toBe(true);
    expect(isProhibitedAttributeKey('accountId')).toBe(true);
    expect(isProhibitedAttributeKey('status')).toBe(false);
  });
});
