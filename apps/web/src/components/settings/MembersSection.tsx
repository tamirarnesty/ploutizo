import { Text } from '@ploutizo/ui/components/text';
import { InviteMemberForm } from './InviteMemberForm';
import { MembersInviteFocusProvider } from './members-invite-focus';
import { MembersList } from './MembersList';

export const MembersSection = () => (
  <MembersInviteFocusProvider>
    <section className="flex flex-col gap-4">
      <Text as="h2" variant="h3">
        Members
      </Text>

      <MembersList />

      <InviteMemberForm />
    </section>
  </MembersInviteFocusProvider>
);
