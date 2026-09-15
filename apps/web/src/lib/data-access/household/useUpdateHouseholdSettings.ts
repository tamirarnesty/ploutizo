import { useMutation, useQueryClient } from '@tanstack/react-query';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import type { HouseholdSettings } from './useGetHouseholdSettings';

interface UpdateHouseholdSettingsBody {
  settlementThreshold: number | null;
}

export const updateHouseholdSettings = async (
  body: UpdateHouseholdSettingsBody
): Promise<HouseholdSettings> => {
  const r = await apiFetch<{ data: HouseholdSettings }>(
    '/api/households/settings',
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    }
  );
  return r.data;
};

export const useUpdateHouseholdSettings = () => {
  const access = useActiveHouseholdAccess();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateHouseholdSettings,
    onSettled: () =>
      void qc.invalidateQueries({
        queryKey: householdQueryKey(access, 'household-settings'),
      }),
  });
};
