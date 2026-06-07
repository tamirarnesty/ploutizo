import { Text } from '@ploutizo/ui/components/text';
import type { AccountOwner, SettlementAccountRow } from '@ploutizo/types';
import { MemberAvatarGroup } from '@/components/members/MemberAvatarGroup';
import { SignedBalanceText } from '@/components/dashboard/SignedBalanceText';
import { RightAlignedCell } from '@/components/dashboard/card-balances/RightAlignedColumnHeader';
import { formatDueShort } from '@/components/dashboard/card-balances/formatDueShort';
import { getFirstNameFromDisplayName } from '@/lib/memberDisplayName';

export const renderCardBalancesCardCell = (
  account: SettlementAccountRow['account']
) => {
  const institution = account.institution?.trim();
  const last = account.lastFour?.trim();

  const metaParts: string[] = [];
  if (institution) metaParts.push(institution);
  if (last) metaParts.push(`•••• ${last}`);

  const metaLine = metaParts.length > 0 ? metaParts.join(' ') : null;

  return (
    <div className="min-w-0">
      <Text
        as="span"
        className="block truncate text-sm leading-tight font-bold"
      >
        {account.name}
      </Text>
      {metaLine !== null ? (
        <Text
          as="span"
          variant="caption"
          className="mt-0.5 block truncate leading-tight"
        >
          {metaLine}
        </Text>
      ) : null}
    </div>
  );
};

export const renderCardBalancesOwnerCell = (owners: AccountOwner[]) => {
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
  const label = isShared
    ? 'Shared'
    : getFirstNameFromDisplayName(sorted[0].displayName);

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

export const renderCardBalancesBalanceCell = (totalBalanceCents: number) => (
  <RightAlignedCell>
    <SignedBalanceText
      cents={totalBalanceCents}
      className="text-sm font-semibold"
    />
  </RightAlignedCell>
);

export const renderCardBalancesDueCell = (dueDate: string | null) => {
  if (!dueDate) {
    return (
      <RightAlignedCell>
        <span className="block min-h-5" aria-hidden>
          {/* Intentionally empty — sketch: no dash when statement due is absent */}
        </span>
      </RightAlignedCell>
    );
  }

  return (
    <RightAlignedCell>
      <Text
        as="span"
        variant="body-sm"
        className="min-h-5 whitespace-nowrap text-foreground tabular-nums"
      >
        {formatDueShort(dueDate)}
      </Text>
    </RightAlignedCell>
  );
};
