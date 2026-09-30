import { useQueryClient } from '@tanstack/react-query';
import { dataEnvelope, householdSettingsSchema } from '@ploutizo/validators';
import type {
  HouseholdSettings,
  UpdateHouseholdSettingsInput,
} from '@ploutizo/validators';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';

export const updateHouseholdSettings = async (
  body: UpdateHouseholdSettingsInput
): Promise<HouseholdSettings> => {
  const r = await apiFetch(
    '/api/households/settings',
    dataEnvelope(householdSettingsSchema),
    { method: 'PATCH', body: JSON.stringify(body) }
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
