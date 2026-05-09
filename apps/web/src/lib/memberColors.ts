// Stable sort by memberId (ascending) → deterministic color assignment.
// Source: 04.2-UI-SPEC.md Color section + 04.2-RESEARCH.md Pattern 7.
// Color tokens chosen to match per-member data-viz palette in UI-SPEC (slot 0 = blue, slot 1 = emerald).
export const MEMBER_COLORS = [
  { bg: 'bg-blue-500', text: 'text-blue-700', progressFill: 'bg-blue-500' },
  {
    bg: 'bg-emerald-500',
    text: 'text-emerald-700',
    progressFill: 'bg-emerald-500',
  },
] as const;

export type MemberColorSlot = (typeof MEMBER_COLORS)[number];

/** One sorted pass — use from list parents instead of repeated `getMemberColorSlot` per row. */
export const buildMemberColorSlotMap = (
  members: { id: string }[]
): Map<string, MemberColorSlot> => {
  const sorted = [...members].sort((a, b) => a.id.localeCompare(b.id));
  const map = new Map<string, MemberColorSlot>();
  for (let i = 0; i < sorted.length; i += 1) {
    const id = sorted[i].id;
    map.set(id, MEMBER_COLORS[i % MEMBER_COLORS.length]);
  }
  return map;
};

export const getMemberColorSlot = (
  members: { id: string }[],
  memberId: string
): MemberColorSlot =>
  buildMemberColorSlotMap(members).get(memberId) ?? MEMBER_COLORS[0];
