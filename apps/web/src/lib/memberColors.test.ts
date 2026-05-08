import { describe, expect, it } from 'vitest';
import { MEMBER_COLORS, getMemberColorSlot } from './memberColors';

describe('memberColors', () => {
  const members = [{ id: 'b-id' }, { id: 'a-id' }, { id: 'c-id' }];

  it('exports MEMBER_COLORS as a tuple of length 2 with bg/text/progressFill keys', () => {
    expect(MEMBER_COLORS.length).toBe(2);
    for (const c of MEMBER_COLORS) {
      expect(c).toHaveProperty('bg');
      expect(c).toHaveProperty('text');
      expect(c).toHaveProperty('progressFill');
    }
  });

  it('assigns slot 0 to the smallest memberId after ascending sort', () => {
    expect(getMemberColorSlot(members, 'a-id')).toBe(MEMBER_COLORS[0]);
  });

  it('is deterministic regardless of input array order', () => {
    const orderA = [{ id: 'a-id' }, { id: 'b-id' }];
    const orderB = [{ id: 'b-id' }, { id: 'a-id' }];
    expect(getMemberColorSlot(orderA, 'a-id')).toBe(
      getMemberColorSlot(orderB, 'a-id')
    );
    expect(getMemberColorSlot(orderA, 'b-id')).toBe(
      getMemberColorSlot(orderB, 'b-id')
    );
  });

  it('wraps via modulo when there are more members than colors', () => {
    // 3 members sorted: a, b, c → indices 0, 1, 2 → colors slot 0, 1, 0
    expect(getMemberColorSlot(members, 'c-id')).toBe(MEMBER_COLORS[0]);
  });

  it('returns slot 0 when memberId is not in members array', () => {
    expect(getMemberColorSlot(members, 'unknown-id')).toBe(MEMBER_COLORS[0]);
  });
});
