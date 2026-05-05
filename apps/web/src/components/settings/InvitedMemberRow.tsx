import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@ploutizo/ui/components/badge';
import { Item, ItemActions } from '@ploutizo/ui/components/item';
import { Text } from '@ploutizo/ui/components/text';
import { ConfirmDialog } from './ConfirmDialog';
import { getExpiryInfo } from './invitationUtils';
import type { PendingInvitation } from '@ploutizo/types';
import { UserAvatar } from '@/components/members/UserAvatar';

interface InvitedMemberRowProps {
  invitation: PendingInvitation;
  onRevoke: (invitationId: string) => void;
}

export const InvitedMemberRow = ({
  invitation,
  onRevoke,
}: InvitedMemberRowProps) => {
  const invitedAgo = formatDistanceToNow(new Date(invitation.createdAt), {
    addSuffix: true,
  });
  const expiryInfo = getExpiryInfo(invitation.expiresAt, invitation.status);

  return (
    <Item variant="outline" className="rounded-md px-4 py-3 opacity-60">
      <div className="flex min-w-0 items-center gap-2">
        <UserAvatar name={invitation.email} className="shrink-0" />
        <div className="flex min-w-0 flex-col">
          <Text
            as="span"
            variant="body-sm"
            className="min-w-0 truncate font-semibold"
          >
            {invitation.email}
          </Text>
          <div className="flex items-center gap-1">
            <Text as="span" variant="caption" className="text-muted-foreground">
              Invited {invitedAgo}
            </Text>
            {expiryInfo ? (
              <Text
                as="span"
                variant="caption"
                className={expiryInfo.className}
              >
                · {expiryInfo.label}
              </Text>
            ) : null}
          </div>
        </div>
        <Badge variant="secondary">Invited</Badge>
      </div>
      <ItemActions>
        <ConfirmDialog
          triggerAriaLabel={`Revoke invite to ${invitation.email}`}
          title={`Revoke invite to ${invitation.email}?`}
          description={`${invitation.email} will no longer be able to join this household using this invite.`}
          cancelLabel="Keep invite"
          confirmLabel="Revoke"
          onConfirm={() => onRevoke(invitation.id)}
        />
      </ItemActions>
    </Item>
  );
};
