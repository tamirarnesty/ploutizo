import { describe, expect, it } from 'vitest';
import {
  buildLegendTopMembers,
  flattenMemberOutstandingTotals,
  rankMembersForLegend,
} from './cardBalancesLegend';

describe('flattenMemberOutstandingTotals', () => {
  it('merges balances for the same member across accounts', () => {
    const lines = flattenMemberOutstandingTotals([
      {
        members: [
          {
            member: { id: 'a', name: 'Ada', avatarUrl: null },
            balanceCents: 500,
          },
        ],
      },
      {
        members: [
          {
            member: { id: 'a', name: 'Ada', avatarUrl: null },
            balanceCents: -200,
          },
        ],
      },
    ]);
    const ada = lines.find((l) => l.memberId === 'a');
    expect(ada).toMatchObject({
      memberName: 'Ada',
      balanceCents: 300,
    });
  });

  it('returns members sorted deterministically by id', () => {
    const lines = flattenMemberOutstandingTotals([
      {
        members: [
          {
            member: { id: 'z', name: 'Zed', avatarUrl: null },
            balanceCents: 1,
          },
        ],
      },
      {
        members: [
          {
            member: { id: 'm', name: 'Moe', avatarUrl: null },
            balanceCents: 2,
          },
        ],
      },
    ]);
    expect(lines.map((l) => l.memberId)).toEqual(['m', 'z']);
  });
});

describe('rankMembersForLegend', () => {
  it('sorts by absolute outstanding first, ties by magnitude then member id', () => {
    const ranked = rankMembersForLegend([
      {
        memberId: 'low',
        memberName: 'Low',
        balanceCents: 100,
      },
      {
        memberId: 'high',
        memberName: 'High',
        balanceCents: -500,
      },
      {
        memberId: 'mid',
        memberName: 'Mid',
        balanceCents: 200,
      },
    ]);
    expect(ranked.map((r) => r.memberId)).toEqual(['high', 'mid', 'low']);
  });
});

describe('buildLegendTopMembers', () => {
  it('keeps deterministic top 3 slot assignment with +N more overflow token', () => {
    const base = flattenMemberOutstandingTotals([
      {
        members: [
          {
            member: { id: 'a', name: 'A', avatarUrl: null },
            balanceCents: 100,
          },
        ],
      },
      {
        members: [
          {
            member: { id: 'b', name: 'B', avatarUrl: null },
            balanceCents: 400,
          },
        ],
      },
      {
        members: [
          {
            member: { id: 'c', name: 'C', avatarUrl: null },
            balanceCents: 300,
          },
        ],
      },
      {
        members: [
          {
            member: { id: 'd', name: 'D', avatarUrl: null },
            balanceCents: 200,
          },
        ],
      },
    ]);
    const { topMembers, overflowCount } = buildLegendTopMembers(base, 3);
    expect(topMembers.map((t) => t.memberId)).toEqual(['b', 'c', 'd']);
    expect(overflowCount).toBe(1);
    const overflowSuffix = overflowCount > 0 ? `+${overflowCount} more` : '';
    expect(overflowSuffix).toBe('+1 more');
  });

  it('has no overflow when at most three members', () => {
    const lines = flattenMemberOutstandingTotals([
      {
        members: [
          { member: { id: 'x', name: 'X', avatarUrl: null }, balanceCents: 1 },
          { member: { id: 'y', name: 'Y', avatarUrl: null }, balanceCents: 2 },
        ],
      },
    ]);
    const { overflowCount } = buildLegendTopMembers(lines, 3);
    expect(overflowCount).toBe(0);
  });
});
