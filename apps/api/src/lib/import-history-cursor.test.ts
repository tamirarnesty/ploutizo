import { describe, expect, it } from 'vitest';
import {
  decodeImportHistoryCursor,
  encodeImportHistoryCursor,
} from '@/lib/import-history-cursor';

describe('import history cursor', () => {
  it('round-trips closed-at and id', () => {
    const closedAt = new Date('2026-05-21T12:00:00.000Z');
    const id = '550e8400-e29b-41d4-a716-446655440040';
    const decoded = decodeImportHistoryCursor(
      encodeImportHistoryCursor(closedAt, id)
    );

    expect(decoded).toEqual({
      closedAt: '2026-05-21T12:00:00.000Z',
      id,
    });
  });

  it('rejects malformed cursors', () => {
    expect(decodeImportHistoryCursor('not-a-cursor')).toBeNull();
    expect(decodeImportHistoryCursor('')).toBeNull();
  });
});
