import { dataEnvelope, householdSettingsSchema } from '@ploutizo/validators';
import type {
  HouseholdSettings,
  UpdateHouseholdSettingsInput,
} from '@ploutizo/validators';
import { useInvalidatingMutation } from '@/lib/data-access/useInvalidatingMutation';
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

export const useUpdateHouseholdSettings = () =>
  useInvalidatingMutation(updateHouseholdSettings, [['household-settings']]);
