import { useQuery } from '@tanstack/react-query';
import { useAccess } from '@/lib/access';
import type { AccessState } from '@/lib/access';
import type { UseQueryResult } from '@tanstack/react-query';

export const isHouseholdAccessReady = (isReady: boolean, access: AccessState) =>
  isReady && access.status === 'signed-in-with-active-household';

export const useHouseholdQuery = <TData, TError = Error>(
  options: unknown
): UseQueryResult<TData, TError> => {
  const { isReady, access } = useAccess();
  const householdReady = isHouseholdAccessReady(isReady, access);
  const queryOptions = options as Parameters<typeof useQuery<TData, TError>>[0];
  return useQuery({
    ...queryOptions,
    enabled: householdReady && (queryOptions.enabled ?? true),
  });
};
