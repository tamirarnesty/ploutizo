import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ploutizo/ui/components/item';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import type { OrgMember } from '@ploutizo/types';
import type { MemberSettlementRollup } from '@/components/dashboard/useCreditCardMemberRollup';
import { UserAvatar } from '@/components/members/UserAvatar';
import { formatCurrency } from '@/lib/formatCurrency';

const cardScopeCaption = (cardCount: number) => {
  if (cardCount === 0) return null;
  return `${cardCount} card${cardCount === 1 ? '' : 's'}`;
};

const memberFirstName = (member: OrgMember) => {
  const firstName = member.firstName?.trim();
  if (firstName) return firstName;
  const [displayFirstName] = member.displayName.trim().split(/\s+/);
  return displayFirstName || member.displayName;
};

type SettlementMemberListRowProps = {
  member: OrgMember;
  rollup: MemberSettlementRollup;
  hasHouseholdCreditCards: boolean;
};

export const SettlementMemberListRow = ({
  member,
  rollup,
  hasHouseholdCreditCards,
}: SettlementMemberListRowProps) => {
  const { cents, cardCount } = rollup;
  const firstName = memberFirstName(member);
  const scopeCaption = cardScopeCaption(cardCount);

  if (!hasHouseholdCreditCards) {
    return (
      <Item
        variant="default"
        size="xs"
        className="w-full flex-nowrap border-0 bg-transparent px-0 py-1 shadow-none transition-colors hover:bg-muted/40"
      >
        <ItemMedia variant="default" className="shrink-0">
          <UserAvatar
            name={member.displayName}
            imageUrl={member.imageUrl ?? null}
            size="sm"
          />
        </ItemMedia>
        <ItemContent className="min-w-0">
          <ItemTitle className="leading-tight">{firstName}</ItemTitle>
          <ItemDescription className="text-xs leading-tight">
            Add a card
          </ItemDescription>
        </ItemContent>
        <ItemActions className="shrink-0">
          <Text
            as="p"
            className="text-right text-base leading-none font-bold whitespace-nowrap text-muted-foreground tabular-nums"
          >
            —
          </Text>
        </ItemActions>
      </Item>
    );
  }

  const isCredit = cents < 0;
  const isZero = cents === 0;

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
        <ItemTitle className="leading-tight">{firstName}</ItemTitle>
        {scopeCaption ? (
          <ItemDescription className="text-xs leading-tight">
            {scopeCaption}
          </ItemDescription>
        ) : null}
      </ItemContent>
      <ItemActions className="shrink-0">
        <Text
          as="p"
          className={cn(
            'text-right text-base leading-none font-bold whitespace-nowrap tabular-nums',
            isCredit && 'text-success',
            isZero && 'text-muted-foreground',
            !isCredit && !isZero && 'text-foreground'
          )}
        >
          {isZero ? '—' : formatCurrency(Math.abs(cents))}
        </Text>
      </ItemActions>
    </Item>
  );
};
