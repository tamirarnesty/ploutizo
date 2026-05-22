import { Text } from '@ploutizo/ui/components/text';
import type { AccountOwner } from '@ploutizo/types';
import { MemberAvatarGroup } from '@/components/members/MemberAvatarGroup';
import { toFirstName } from '@/components/dashboard/card-balances/cardBalancesDisplayHelpers';

type CardBalancesOwnerCellProps = {
  owners: AccountOwner[];
};

/**
 * Owner column follows `account_members` (GET /accounts owners), not settlement splits.
 * Multiple linked owners ⇒ stacked avatars + “Shared”.
 */
export const CardBalancesOwnerCell = ({
  owners,
}: CardBalancesOwnerCellProps) => {
  const sorted = [...owners].sort(
    (a, b) =>
      a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id)
  );

  if (sorted.length === 0) {
    return <Text variant="caption">—</Text>;
  }

  const avatarMembers = sorted.map((o) => ({
    id: o.id,
    name: o.displayName,
    imageUrl: o.imageUrl,
  }));

  const isShared = sorted.length > 1;
  const label = isShared ? 'Shared' : toFirstName(sorted[0].displayName);

  const avatarsForSketch = isShared
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
