import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Account } from '@ploutizo/types';
import { apiFetch } from '@/lib/queryClient';

interface CreateAccountBody {
  name: string;
  type: string;
  institution?: string;
  lastFour?: string;
  eachPersonPaysOwn?: boolean;
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
