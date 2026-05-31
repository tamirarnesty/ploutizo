import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ploutizo/ui/components/item';
import type { OrgMember } from '@ploutizo/types';
import type { MemberSettlementRollup } from '@/lib/settlements';
import { SignedBalanceText } from '@/components/dashboard/SignedBalanceText';
import { UserAvatar } from '@/components/members/UserAvatar';
import { getOrgMemberFirstName } from '@/lib/memberDisplayName';

const cardScopeCaption = (cardCount: number) => {
  if (cardCount === 0) return null;
  return `${cardCount} card${cardCount === 1 ? '' : 's'}`;
};

type SettlementMemberListRowBalanceProps = {
  member: OrgMember;
  rollup: MemberSettlementRollup;
};

export const SettlementMemberListRowBalance = ({
  member,
  rollup,
}: SettlementMemberListRowBalanceProps) => {
  const scopeCaption = cardScopeCaption(rollup.cardCount);

  return (
    <Item
      variant="default"
      size="xs"
      className="w-full flex-nowrap border-0 bg-transparent p-1 shadow-none transition-colors hover:bg-muted/40"
    >
      <ItemMedia variant="default" className="shrink-0">
        <UserAvatar
          name={member.displayName}
          imageUrl={member.imageUrl ?? null}
          size="sm"
        />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="leading-tight">
          {getOrgMemberFirstName(member)}
        </ItemTitle>
        {scopeCaption ? (
          <ItemDescription className="text-xs leading-tight">
            {scopeCaption}
          </ItemDescription>
        ) : null}
      </ItemContent>
      <ItemActions className="shrink-0">
        <SignedBalanceText
          as="p"
          cents={rollup.cents}
          zeroDisplay="dash"
          className="text-right text-base leading-none font-bold"
        />
      </ItemActions>
    </Item>
  );
};
