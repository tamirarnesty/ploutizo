import { memberFullLabel, memberShortLabel } from '@ploutizo/utils';
import type {
  MemberIdentity,
  OrgMember,
  SettlementAccountRow,
} from '@ploutizo/types';
import type { PayToward } from '@/components/dashboard/settleFormSchema';

export type CardBalanceAttributionChip =
  | {
      kind: 'member';
      memberId: string;
      label: string;
      balanceCents: number;
    }
  | {
      kind: 'shared';
      label: 'Shared';
      balanceCents: number;
    };

export type CardBalanceOwnerDisplay = {
  avatars: { id: string; name: string; imageUrl: string | null }[];
  label: string;
};

export type CardBalanceSettleMenuEntry = {
  payToward: PayToward;
  label: string;
  balanceCents: number;
};

export type CardBalanceRowViewModel = SettlementAccountRow & {
  ownerDisplay: CardBalanceOwnerDisplay;
  attributionChips: CardBalanceAttributionChip[];
  settleMenuEntries: CardBalanceSettleMenuEntry[];
};

const memberFromHousehold = (
  household: readonly OrgMember[],
  id: string,
  fallback: MemberIdentity
): MemberIdentity => household.find((member) => member.id === id) ?? fallback;

const buildOwnerDisplay = (
  owners: MemberIdentity[],
  household: readonly OrgMember[]
): CardBalanceOwnerDisplay => {
  const sorted = [...owners].sort(
    (a, b) =>
      memberFullLabel(a).localeCompare(memberFullLabel(b)) ||
      a.id.localeCompare(b.id)
  );

  if (sorted.length === 0) {
    return { avatars: [], label: '—' };
  }

  const isShared = sorted.length > 1;
  const primary = sorted[0];
  const primaryMember = memberFromHousehold(household, primary.id, primary);
  const label = isShared
    ? 'Shared'
    : memberShortLabel(primaryMember, household);
  const avatars = (isShared ? sorted.slice(0, 2) : sorted.slice(0, 1)).map(
    (owner) => {
      const member = memberFromHousehold(household, owner.id, owner);
      return {
        id: owner.id,
        name: memberFullLabel(member),
        imageUrl: owner.imageUrl,
      };
    }
  );

  return { avatars, label };
};

const buildAttributionChips = (
  account: SettlementAccountRow,
  household: readonly OrgMember[]
): CardBalanceAttributionChip[] => {
  const chips: CardBalanceAttributionChip[] = [...account.members]
    .sort((a, b) => a.member.id.localeCompare(b.member.id))
    .filter((memberRow) => memberRow.personalBalanceCents !== 0)
    .map((memberRow) => {
      const member = memberFromHousehold(
        household,
        memberRow.member.id,
        memberRow.member
      );
      return {
        kind: 'member' as const,
        memberId: memberRow.member.id,
        label: memberShortLabel(member, household),
        balanceCents: memberRow.personalBalanceCents,
      };
    });

  if (account.sharedBalanceCents !== 0) {
    chips.push({
      kind: 'shared',
      label: 'Shared',
      balanceCents: account.sharedBalanceCents,
    });
  }

  return chips;
};

const buildSettleMenuEntries = (
  account: SettlementAccountRow,
  household: readonly OrgMember[]
): CardBalanceSettleMenuEntry[] => {
  const memberEntries = [...account.members]
    .map((memberRow) => {
      const member = memberFromHousehold(
        household,
        memberRow.member.id,
        memberRow.member
      );
      return {
        payToward: memberRow.member.id,
        label: memberFullLabel(member),
        balanceCents: memberRow.personalBalanceCents,
      };
    })
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
    );

  return [
    ...memberEntries,
    {
      payToward: 'shared',
      label: 'Shared',
      balanceCents: account.sharedBalanceCents,
    },
  ];
};

export const buildCardBalanceViewModels = (
  accounts: SettlementAccountRow[],
  household: readonly OrgMember[]
): CardBalanceRowViewModel[] =>
  accounts.map((account) => ({
    ...account,
    ownerDisplay: buildOwnerDisplay(account.account.owners, household),
    attributionChips: buildAttributionChips(account, household),
    settleMenuEntries: buildSettleMenuEntries(account, household),
  }));
