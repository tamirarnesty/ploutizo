import { Badge } from '@ploutizo/ui/components/badge';
import { Item, ItemActions } from '@ploutizo/ui/components/item';
import { Text } from '@ploutizo/ui/components/text';
import { ConfirmDialog } from './ConfirmDialog';
import type { OrgMember } from '@ploutizo/types';
import { UserAvatar } from '@/components/members/UserAvatar';

interface MemberRowProps {
  member: OrgMember;
  isCurrentUser: boolean;
  onRemove: (memberId: string) => void;
}

export const MemberRow = ({
  member,
  isCurrentUser,
  onRemove,
}: MemberRowProps) => (
  <Item variant="outline" className="rounded-md px-4 py-3">
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <UserAvatar
        name={member.displayName}
        imageUrl={member.imageUrl}
        className="shrink-0"
      />
      <Text
        as="span"
        variant="body-sm"
        className="min-w-0 truncate font-semibold"
      >
        {member.displayName}
      </Text>
      {isCurrentUser ? <Badge variant="secondary">You</Badge> : null}
    </div>
    <ItemActions className="ml-auto">
      <Text
        as="span"
        variant="caption"
        className="text-muted-foreground capitalize"
      >
        {member.role}
      </Text>
      {!isCurrentUser ? (
        <ConfirmDialog
          triggerAriaLabel={`Remove ${member.displayName}`}
          triggerClassName="opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
          tooltip="Remove member"
          title={`Remove ${member.firstName ?? member.displayName}?`}
          description={`Remove ${member.displayName} from this household? They will lose access immediately.`}
          cancelLabel="Keep member"
          confirmLabel="Remove"
          onConfirm={() => onRemove(member.id)}
        />
      ) : null}
    </ItemActions>
  </Item>
);
