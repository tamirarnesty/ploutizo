import { getHouseholdBearer } from './working-set';
import type { QueryClient, QueryKey } from '@tanstack/react-query';

type HouseholdPrefetchOptions = {
  queryKey: QueryKey;
} & Record<string, unknown>;

/** Prefetch household query data when a verified bearer is available. */
export const ensureHouseholdQueryData = async (
  queryClient: QueryClient,
  options: HouseholdPrefetchOptions
) => {
  const token = await getHouseholdBearer();
  if (!token) {
    return undefined;
  }
  return queryClient
    .ensureQueryData(options as Parameters<QueryClient['ensureQueryData']>[0])
    .catch(() => undefined);
};
