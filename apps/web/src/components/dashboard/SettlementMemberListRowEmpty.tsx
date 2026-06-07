import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ploutizo/ui/components/item';
import { Text } from '@ploutizo/ui/components/text';
import type { OrgMember } from '@ploutizo/types';
import { UserAvatar } from '@/components/members/UserAvatar';
import { getOrgMemberFirstName } from '@/lib/memberDisplayName';

type SettlementMemberListRowEmptyProps = {
  member: OrgMember;
};

export const SettlementMemberListRowEmpty = ({
  member,
}: SettlementMemberListRowEmptyProps) => (
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
      <ItemTitle className="leading-tight">
        {getOrgMemberFirstName(member)}
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
