import { useInvalidatingMutation } from '@/lib/data-access/useInvalidatingMutation';
import { apiSend } from '@/lib/queryClient';

export const useInviteMember = () =>
  useInvalidatingMutation(
    (email: string) =>
      apiSend('/api/households/invitations', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    [['members'], ['invitations']]
  );
