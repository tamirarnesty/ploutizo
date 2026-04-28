import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { HouseholdSettings } from './useGetHouseholdSettings';
import { apiFetch } from '@/lib/queryClient';

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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateHouseholdSettings,
    onSettled: () =>
      void qc.invalidateQueries({ queryKey: ['household-settings'] }),
  });
};
