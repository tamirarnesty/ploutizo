import { useCallback } from 'react';
import { useUser } from '@clerk/tanstack-react-start';
import { ItemGroup } from '@ploutizo/ui/components/item';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import { InviteMemberForm } from './InviteMemberForm';
import { InvitedMemberRow } from './InvitedMemberRow';
import { MemberRow } from './MemberRow';
import { MembersEmptyState } from './MembersEmptyState';
import {
  useGetOrgInvitations,
  useGetOrgMembers,
  useRemoveMember,
  useRevokeInvitation,
} from '@/lib/data-access/org';

export const MembersSection = () => {
  // Per D-13: BOTH queries called unconditionally at top level — no waterfall.
  const membersQuery = useGetOrgMembers();
  const invitationsQuery = useGetOrgInvitations();
  const { user } = useUser();
  const removeMutation = useRemoveMember();
  const revokeMutation = useRevokeInvitation();

  const members = membersQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];
  const isLoading = !membersQuery.data && !invitationsQuery.data;

  const handleRemove = useCallback(
    (memberId: string) => removeMutation.mutate(memberId),
    [removeMutation]
  );
  const handleRevoke = useCallback(
    (invitationId: string) => revokeMutation.mutate(invitationId),
    [revokeMutation]
  );
  const handleFocusInviteInput = useCallback(() => {
    (
      document.getElementById('invite-email') as HTMLInputElement | null
    )?.focus();
  }, []);

  // Per D-14: empty only when both lists are empty.
  const isEmpty = members.length === 0 && invitations.length === 0;

  return (
    <section className="flex flex-col gap-4">
      <Text as="h2" variant="h3">
        Members
      </Text>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-md" />
          ))}
        </div>
      ) : isEmpty ? (
        <MembersEmptyState onInviteClick={handleFocusInviteInput} />
      ) : (
        <ItemGroup className="gap-2">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isCurrentUser={member.externalId === user?.id}
              onRemove={handleRemove}
            />
          ))}
          {invitations.map((invitation) => (
            <InvitedMemberRow
              key={invitation.id}
              invitation={invitation}
              onRevoke={handleRevoke}
            />
          ))}
        </ItemGroup>
      )}

      <InviteMemberForm />
    </section>
  );
};
