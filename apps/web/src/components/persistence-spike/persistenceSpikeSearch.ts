import { z } from 'zod';

const persistenceSpikeSearchSchema = z.object({
  api: z.literal('offline').optional(),
});

export type PersistenceSpikeSearch = z.infer<
  typeof persistenceSpikeSearchSchema
>;

export const validatePersistenceSpikeSearch = (
  search: Record<string, unknown>
): PersistenceSpikeSearch => {
  const parsed = persistenceSpikeSearchSchema.safeParse(search);
  return parsed.success ? parsed.data : {};
};
