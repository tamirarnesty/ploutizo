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
    <div className="flex min-w-0 items-center gap-2">
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
    <ItemActions>
      <Text as="span" variant="caption" className="capitalize">
        {member.role}
      </Text>
      {!isCurrentUser ? (
        <ConfirmDialog
          triggerAriaLabel={`Remove ${member.displayName}`}
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
