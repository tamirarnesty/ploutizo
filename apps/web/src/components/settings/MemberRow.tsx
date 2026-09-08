import { Badge } from '@ploutizo/ui/components/badge';
import { Item, ItemActions } from '@ploutizo/ui/components/item';
import { Text } from '@ploutizo/ui/components/text';
import { memberFullLabel, memberShortLabel } from '@ploutizo/utils';
import type { OrgMember } from '@ploutizo/types';
import { UserAvatar } from '@/components/members/UserAvatar';
import { ConfirmDialog } from './ConfirmDialog';

interface MemberRowProps {
  member: OrgMember;
  household: readonly OrgMember[];
  isCurrentUser: boolean;
  onRemove: (memberId: string) => void;
}

export const MemberRow = ({
  member,
  household,
  isCurrentUser,
  onRemove,
}: MemberRowProps) => {
  const fullName = memberFullLabel(member);
  const shortName = memberShortLabel(member, household);

  return (
    <Item variant="outline" className="rounded-md px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <UserAvatar
          name={fullName}
          imageUrl={member.imageUrl}
          className="shrink-0"
        />
        <Text
          as="span"
          variant="body-sm"
          className="min-w-0 truncate font-semibold"
        >
          {fullName}
        </Text>
        {isCurrentUser ? <Badge variant="secondary">You</Badge> : null}
      </div>
      <ItemActions className="ml-auto">
        {!isCurrentUser ? (
          <ConfirmDialog
            triggerAriaLabel={`Remove ${fullName}`}
            triggerClassName="opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
            tooltip="Remove member"
            title={`Remove ${shortName}?`}
            description={`Remove ${fullName} from this household? They will lose access immediately.`}
            cancelLabel="Keep member"
            confirmLabel="Remove"
            onConfirm={() => onRemove(member.id)}
          />
        ) : (
          <div className="size-9 shrink-0" />
        )}
        <Badge variant="outline" className="capitalize">
          {member.role}
        </Badge>
      </ItemActions>
    </Item>
  );
};
