import { useInvalidatingMutation } from '@/lib/data-access/useInvalidatingMutation';
import { apiSend } from '@/lib/queryClient';

export const useRevokeInvitation = () =>
  useInvalidatingMutation(
    (invitationId: string) =>
      apiSend(`/api/households/invitations/${invitationId}`, {
        method: 'DELETE',
      }),
    [['invitations']]
  );
