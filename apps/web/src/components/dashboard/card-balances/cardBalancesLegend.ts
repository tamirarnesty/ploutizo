import type { OrgMember, SettlementAccountRow } from '@ploutizo/types';

/**
 * Pure helpers for the Card Balances header legend (top contributors + overflow).
 * Deterministic: sort keys and tie-break rules are stable for tests.
 */

export type MemberBalanceLine = Readonly<{
  memberId: OrgMember['id'];
  memberName: OrgMember['displayName'];
  balanceCents: number;
}>;

/** Sum per-member balances across settlement rows (duplicate member ids consolidate). */
export const flattenMemberOutstandingTotals = (
  accounts: readonly Pick<SettlementAccountRow, 'members'>[]
): MemberBalanceLine[] => {
  const map = new Map<string, { name: string; cents: number }>();
  for (const row of accounts) {
    for (const entry of row.members) {
      const id = entry.member.id;
      const prev = map.get(id);
      const name = entry.member.name;
      const cents = prev ? prev.cents + entry.balanceCents : entry.balanceCents;
      map.set(id, { name: prev?.name ?? name, cents });
    }
  }

  const lines: MemberBalanceLine[] = [];
  map.forEach((v, memberId) => {
    lines.push({
      memberId,
      memberName: v.name,
      balanceCents: v.cents,
    });
  });
  lines.sort((a, b) => a.memberId.localeCompare(b.memberId));
  return lines;
};

export const compareLegendRank = (
  a: MemberBalanceLine,
  b: MemberBalanceLine
): number => {
  const cmp =
    Math.abs(b.balanceCents) - Math.abs(a.balanceCents) ||
    b.balanceCents - a.balanceCents;
  if (cmp !== 0) return cmp;
  return a.memberId.localeCompare(b.memberId);
};

export const rankMembersForLegend = (
  lines: readonly MemberBalanceLine[]
): MemberBalanceLine[] => [...lines].sort(compareLegendRank);

/** Top members for header tokens and how many rows are not shown (`+N more`). */
export const buildLegendTopMembers = (
  lines: readonly MemberBalanceLine[],
  limit = 3
): {
  readonly topMembers: MemberBalanceLine[];
  readonly overflowCount: number;
} => {
  const ranked = rankMembersForLegend(lines);
  return {
    topMembers: ranked.slice(0, limit),
    overflowCount: ranked.length <= limit ? 0 : ranked.length - limit,
  };
};
