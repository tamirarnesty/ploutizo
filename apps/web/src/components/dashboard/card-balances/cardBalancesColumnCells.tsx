import { Text } from '@ploutizo/ui/components/text';
import { formatAccountInstitutionMeta } from '@ploutizo/utils';
import type { SettlementAccountRow } from '@ploutizo/types';
import { MemberAvatarGroup } from '@/components/members/MemberAvatarGroup';
import { SignedBalanceText } from '@/components/dashboard/SignedBalanceText';
import { RightAlignedCell } from '@/components/dashboard/card-balances/RightAlignedColumnHeader';
import type { CardBalanceOwnerDisplay } from '@/components/dashboard/card-balances/buildCardBalanceViewModels';
import { formatDueShort } from '@/components/dashboard/card-balances/formatDueShort';

export const renderCardBalancesCardCell = (
  account: SettlementAccountRow['account']
) => {
  const metaLine = formatAccountInstitutionMeta({
    institutionId: account.institutionId,
    lastFour: account.lastFour,
  });

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

export const renderCardBalancesOwnerCell = (
  ownerDisplay: CardBalanceOwnerDisplay
) => {
  if (ownerDisplay.avatars.length === 0) {
    return <Text variant="caption">—</Text>;
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <MemberAvatarGroup members={ownerDisplay.avatars} max={3} />
      <Text
        as="span"
        variant="body-sm"
        className="min-w-0 flex-1 truncate leading-snug font-medium"
      >
        {ownerDisplay.label}
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
