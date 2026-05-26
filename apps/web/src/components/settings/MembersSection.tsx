import { Text } from '@ploutizo/ui/components/text';
import { InviteMemberForm } from './InviteMemberForm';
import { MembersList } from './MembersList';

export const MembersSection = () => (
  <section className="flex flex-col gap-4">
    <Text as="h2" variant="h3">
      Members
    </Text>

    <MembersList />

    <InviteMemberForm />
  </section>
);
