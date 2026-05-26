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

const focusInviteEmailInput = () => {
  (document.getElementById('invite-email') as HTMLInputElement | null)?.focus();
};

export const MembersEmptyState = () => (
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
      <Button variant="outline" size="sm" onClick={focusInviteEmailInput}>
        Send an invite
      </Button>
    </EmptyContent>
  </Empty>
);
