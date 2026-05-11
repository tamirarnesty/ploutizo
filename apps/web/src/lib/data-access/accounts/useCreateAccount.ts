import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/queryClient';
import type { Account } from '@ploutizo/types';

interface CreateAccountBody {
  name: string;
  type: string;
  institution?: string;
  lastFour?: string;
  memberIds?: string[];
}

export const createAccount = async (
  body: CreateAccountBody
): Promise<Account> => {
  const r = await apiFetch<{ data: Account }>('/api/accounts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return r.data;
};

export const useCreateAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAccount,
    onSettled: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
};
