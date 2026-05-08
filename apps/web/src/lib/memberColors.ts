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

export const getMemberColorSlot = (
  members: { id: string }[],
  memberId: string
): MemberColorSlot => {
  const sorted = [...members].sort((a, b) => a.id.localeCompare(b.id));
  const idx = sorted.findIndex((m) => m.id === memberId);
  // Wrap if more members than colors; -1 (not found) also wraps to slot 0 via abs(idx) — guard explicitly:
  const safeIdx = idx < 0 ? 0 : idx;
  return MEMBER_COLORS[safeIdx % MEMBER_COLORS.length];
};
