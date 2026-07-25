import { describe, expect, it } from 'vitest';
import {
  SHAPE_MAX_DEPTH,
  isBlocklistedAttributeKey,
  shapeAttributes,
  shapeMessage,
} from '../shape';

describe('shapeAttributes', () => {
  it('passes through typed safe attributes', () => {
    const { attributes, droppedKeys, truncated } = shapeAttributes({
      status: 200,
      method: 'GET',
      route: '/api/transactions',
      retryCount: 1,
    });

    expect(attributes).toEqual({
      status: 200,
      method: 'GET',
      route: '/api/transactions',
      retryCount: 1,
    });
    expect(droppedKeys).toEqual([]);
    expect(truncated).toBe(false);
  });

  it('drops blocklisted keys when callers bypass types at runtime', () => {
    const { attributes, droppedKeys } = shapeAttributes({
      status: 404,
      password: 'hunter2',
      body: { nested: true },
      authorization: 'Bearer abc',
    });

    expect(attributes).toEqual({ status: 404 });
    expect(droppedKeys).toEqual(
      expect.arrayContaining(['password', 'body', 'authorization'])
    );
  });

  it('bounds object depth', () => {
    const deep = { a: { b: { c: { d: { e: { f: 'too-deep' } } } } } };
    const { attributes } = shapeAttributes(deep, {
      maxDepth: SHAPE_MAX_DEPTH,
    });

    expect(JSON.stringify(attributes)).not.toContain('too-deep');
  });

  it('bounds key count and string length', () => {
    const manyKeys: Record<string, string> = {};
    for (let i = 0; i < 50; i += 1) {
      manyKeys[`key${i}`] = 'x'.repeat(10);
    }

    const { attributes, truncated, droppedKeys } = shapeAttributes(manyKeys, {
      maxKeys: 5,
      maxStringLength: 8,
    });

    expect(Object.keys(attributes).length).toBeLessThanOrEqual(5);
    expect(truncated).toBe(true);
    expect(droppedKeys.length).toBeGreaterThan(0);
    expect(String(attributes.key0).length).toBeLessThanOrEqual(8);
  });

  it('drops oversized payloads', () => {
    const bulky: Record<string, string> = {};
    for (let i = 0; i < 30; i += 1) {
      bulky[`field${i}`] = 'y'.repeat(180);
    }

    const { attributes, truncated, droppedKeys } = shapeAttributes(bulky, {
      maxTotalBytes: 200,
      maxKeys: 32,
    });

    expect(truncated).toBe(true);
    expect(attributes).toEqual({});
    expect(droppedKeys).toContain('(payload)');
  });

  it('never throws on malformed input', () => {
    expect(() => shapeAttributes(undefined)).not.toThrow();
    expect(() => shapeAttributes(null)).not.toThrow();
    expect(() => shapeAttributes('plain')).not.toThrow();
    expect(() => shapeAttributes([1, 2, 3])).not.toThrow();
    expect(shapeAttributes(undefined).attributes).toEqual({});
  });

  it('exposes blocklist helper for callers', () => {
    expect(isBlocklistedAttributeKey('password')).toBe(true);
    expect(isBlocklistedAttributeKey('status')).toBe(false);
  });
});

describe('shapeMessage', () => {
  it('trims and truncates diagnostic messages', () => {
    expect(shapeMessage('  hello  ')).toBe('hello');
    expect(shapeMessage('x'.repeat(250))?.length).toBe(200);
    expect(shapeMessage('   ')).toBeUndefined();
  });
});
