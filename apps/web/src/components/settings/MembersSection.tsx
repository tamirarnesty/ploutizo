import { useCallback } from 'react';
import { useUser } from '@clerk/tanstack-react-start';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import { InviteMemberForm } from './InviteMemberForm';
import { MemberRow } from './MemberRow';
import { useGetOrgMembers, useRemoveMember } from '@/lib/data-access/org';

export const MembersSection = () => {
  const { data: members = [], isLoading } = useGetOrgMembers();
  const { user } = useUser();
  const removeMutation = useRemoveMember();
  const handleRemove = useCallback(
    (memberId: string) => removeMutation.mutate(memberId),
    [removeMutation]
  );

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
      ) : members.length === 0 ? (
        <Text variant="body-sm" className="text-muted-foreground">
          This household has no other members.
        </Text>
      ) : (
        <ul className="space-y-2">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isCurrentUser={member.externalId === user?.id}
              onRemove={handleRemove}
            />
          ))}
        </ul>
      )}

      <InviteMemberForm />
    </section>
  );
};
