/** Matches `memberColors.ts` roster resolution — stable across header + breakdown. */

export const MEMBER_CHART_DOT_CLASSES = [
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
] as const;

/**
 * Segment bar fills: same hue order as dots, toned down vs full chart tokens so the bar reads
 * on `accent`/bordered tracks in light and dark (`globals.css` chart palette).
 */
export const MEMBER_CHART_SEGMENT_CLASSES = [
  'bg-chart-1/[0.36] dark:bg-chart-1/[0.42]',
  'bg-chart-2/[0.36] dark:bg-chart-2/[0.42]',
  'bg-chart-3/[0.36] dark:bg-chart-3/[0.42]',
  'bg-chart-4/[0.36] dark:bg-chart-4/[0.42]',
  'bg-chart-5/[0.36] dark:bg-chart-5/[0.42]',
] as const;

export type MemberChartDotClass = (typeof MEMBER_CHART_DOT_CLASSES)[number];
export type MemberChartSegmentClass =
  (typeof MEMBER_CHART_SEGMENT_CLASSES)[number];
export type MemberChartSlotClassMap = Map<string, MemberChartDotClass>;
export type MemberChartSegmentSlotClassMap = Map<
  string,
  MemberChartSegmentClass
>;

export type MemberChartVisualSlots = {
  dotClasses: MemberChartSlotClassMap;
  segmentClasses: MemberChartSegmentSlotClassMap;
};

const sortedUniqueMemberIds = (memberIds: readonly string[]): string[] =>
  [...new Set(memberIds)].sort((a, b) => a.localeCompare(b));

/**
 * Dot colours (legend + badges) and softer segment fills (split bar only), stable by member id sort.
 */
export const buildMemberChartVisualSlots = (
  memberIds: readonly string[]
): MemberChartVisualSlots => {
  const sorted = sortedUniqueMemberIds(memberIds);
  const n = MEMBER_CHART_DOT_CLASSES.length;
  const dotClasses = new Map<string, MemberChartDotClass>();
  const segmentClasses = new Map<string, MemberChartSegmentClass>();
  for (let i = 0; i < sorted.length; i += 1) {
    const id = sorted[i];
    dotClasses.set(id, MEMBER_CHART_DOT_CLASSES[i % n]);
    segmentClasses.set(id, MEMBER_CHART_SEGMENT_CLASSES[i % n]);
  }
  return { dotClasses, segmentClasses };
};

/** First whitespace-delimited segment of roster name (settlements expose `member.name`). */
export const getMemberDisplayFirstName = (fullName: string): string => {
  const trimmed = fullName.trim();
  if (!trimmed) return '—';
  return trimmed.split(/\s+/)[0];
};
