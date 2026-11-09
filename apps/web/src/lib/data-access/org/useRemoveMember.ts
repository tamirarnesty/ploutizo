import { useInvalidatingMutation } from '@/lib/data-access/useInvalidatingMutation';
import { apiSend } from '@/lib/queryClient';

export const useRemoveMember = () =>
  useInvalidatingMutation(
    (memberId: string) =>
      apiSend(`/api/households/members/${memberId}`, {
        method: 'DELETE',
      }),
    [['members']]
  );
