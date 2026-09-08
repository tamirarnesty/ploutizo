import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ploutizo/ui/components/item';
import { Text } from '@ploutizo/ui/components/text';
import { memberFullLabel, memberShortLabel } from '@ploutizo/utils';
import type { OrgMember } from '@ploutizo/types';
import { UserAvatar } from '@/components/members/UserAvatar';

type SettlementMemberListRowEmptyProps = {
  member: OrgMember;
  household: OrgMember[];
};

export const SettlementMemberListRowEmpty = ({
  member,
  household,
}: SettlementMemberListRowEmptyProps) => (
  <Item
    variant="default"
    size="xs"
    className="w-full flex-nowrap border-0 bg-transparent px-0 py-1 shadow-none transition-colors hover:bg-muted/40"
  >
    <ItemMedia variant="default" className="shrink-0">
      <UserAvatar
        name={memberFullLabel(member)}
        imageUrl={member.imageUrl ?? null}
        size="sm"
      />
    </ItemMedia>
    <ItemContent className="min-w-0">
      <ItemTitle className="leading-tight">
        {memberShortLabel(member, household)}
      </ItemTitle>
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
