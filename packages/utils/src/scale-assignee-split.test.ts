import { describe, expect, it } from 'vitest';
import { scaleAssigneeSplitProportionally } from './scale-assignee-split';

describe('scaleAssigneeSplitProportionally', () => {
  it('returns empty array for no assignees', () => {
    expect(scaleAssigneeSplitProportionally([], 1000)).toEqual([]);
  });

  it('zeros all rows when new total is 0', () => {
    expect(
      scaleAssigneeSplitProportionally(
        [
          { memberId: 'a', amountCents: 6000, percentage: 60 },
          { memberId: 'b', amountCents: 4000, percentage: 40 },
        ],
        0
      )
    ).toEqual([
      { memberId: 'a', amountCents: 0, percentage: 0 },
      { memberId: 'b', amountCents: 0, percentage: 0 },
    ]);
  });

  it('scales proportionally and preserves ratios', () => {
    const result = scaleAssigneeSplitProportionally(
      [
        { memberId: 'a', amountCents: 6000, percentage: 60 },
        { memberId: 'b', amountCents: 4000, percentage: 40 },
      ],
      20000
    );

    expect(result).toEqual([
      { memberId: 'a', amountCents: 12000, percentage: 60 },
      { memberId: 'b', amountCents: 8000, percentage: 40 },
    ]);
  });

  it('distributes remainder cents via largest remainder', () => {
    const result = scaleAssigneeSplitProportionally(
      [
        { memberId: 'a', amountCents: 6000, percentage: 60 },
        { memberId: 'b', amountCents: 4000, percentage: 40 },
      ],
      10001
    );

    expect(result.reduce((sum, row) => sum + row.amountCents, 0)).toBe(10001);
    expect(result[0].amountCents).toBe(6001);
    expect(result[1].amountCents).toBe(4000);
  });

  it('re-evens when prior total was 0', () => {
    const result = scaleAssigneeSplitProportionally(
      [
        { memberId: 'a', amountCents: 0, percentage: 0 },
        { memberId: 'b', amountCents: 0, percentage: 0 },
      ],
      100
    );

    expect(result).toEqual([
      { memberId: 'a', amountCents: 50, percentage: 50 },
      { memberId: 'b', amountCents: 50, percentage: 50 },
    ]);
  });

  it('uses preserved percentages when prior cent total was 0', () => {
    const result = scaleAssigneeSplitProportionally(
      [
        { memberId: 'a', amountCents: 0, percentage: 60 },
        { memberId: 'b', amountCents: 0, percentage: 40 },
      ],
      20000
    );

    expect(result).toEqual([
      { memberId: 'a', amountCents: 12000, percentage: 60 },
      { memberId: 'b', amountCents: 8000, percentage: 40 },
    ]);
  });

  it('computes percentages for negative totals', () => {
    const result = scaleAssigneeSplitProportionally(
      [
        { memberId: 'a', amountCents: -600, percentage: 0 },
        { memberId: 'b', amountCents: -400, percentage: 0 },
      ],
      -1000
    );

    expect(result).toEqual([
      { memberId: 'a', amountCents: -600, percentage: 60 },
      { memberId: 'b', amountCents: -400, percentage: 40 },
    ]);
  });
});
