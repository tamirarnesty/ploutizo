import { Text } from '@ploutizo/ui/components/text';
import type { SettlementMemberRow } from '@ploutizo/types';
import { MemberAvatarGroup } from '@/components/members/MemberAvatarGroup';

type CardBalancesOwnerCellProps = {
  members: SettlementMemberRow[];
};

/**
 * Sketch 006: primary owner avatar + single name OR stacked avatars + “Shared”.
 * Heuristic: split across multiple obligated members ⇒ shared household card vibe.
 */
export const CardBalancesOwnerCell = ({
  members,
}: CardBalancesOwnerCellProps) => {
  const nonZero = members.filter((m) => m.balanceCents !== 0);
  const forDisplay =
    nonZero.length > 0
      ? [...nonZero].sort(
          (a, b) =>
            Math.abs(b.balanceCents) - Math.abs(a.balanceCents) ||
            a.member.id.localeCompare(b.member.id)
        )
      : [...members];

  if (forDisplay.length === 0) {
    return (
      <Text variant="caption" className="text-muted-foreground">
        —
      </Text>
    );
  }

  const avatarMembers = forDisplay.map((m) => ({
    id: m.member.id,
    name: m.member.name,
    imageUrl: m.member.avatarUrl,
  }));

  const isSharedHouseholdSplit = forDisplay.length > 1;

  const label = isSharedHouseholdSplit ? 'Shared' : forDisplay[0].member.name;

  const avatarsForSketch = isSharedHouseholdSplit
    ? avatarMembers.slice(0, 2)
    : avatarMembers.slice(0, 1);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <MemberAvatarGroup members={avatarsForSketch} max={3} />
      <Text
        as="span"
        variant="body-sm"
        className="min-w-0 flex-1 truncate leading-snug font-medium"
      >
        {label}
      </Text>
    </div>
  );
};
