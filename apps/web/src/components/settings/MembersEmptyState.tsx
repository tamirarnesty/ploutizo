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

interface MembersEmptyStateProps {
  onInviteClick: () => void;
}

export function MembersEmptyState({ onInviteClick }: MembersEmptyStateProps) {
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
        <Button variant="outline" size="sm" onClick={onInviteClick}>
          Send an invite
        </Button>
      </EmptyContent>
    </Empty>
  );
}
