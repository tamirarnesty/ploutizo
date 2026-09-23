import { useQueryClient } from '@tanstack/react-query';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { HouseholdSettings } from './useGetHouseholdSettings';

interface UpdateHouseholdSettingsBody {
  settlementThreshold?: number | null;
  autoCheckImportRowWhenReady?: boolean;
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
  return useHouseholdMutation({
    mutationFn: updateHouseholdSettings,
    onSettled: () =>
      void qc.invalidateQueries({
        queryKey: ['household-settings'],
      }),
  });
};
