import { UserPlus } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ploutizo/ui/components/empty';
import { useFocusMembersInviteEmail } from './members-invite-focus';

export const MembersEmptyState = () => {
  const focusInviteEmail = useFocusMembersInviteEmail();

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UserPlus className="size-6" />
        </EmptyMedia>
        <EmptyTitle>No members yet</EmptyTitle>
        <EmptyDescription>
          This household has no other members. Invite someone to get started.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" onClick={focusInviteEmail}>
          Send an invite
        </Button>
      </EmptyContent>
    </Empty>
  );
};
