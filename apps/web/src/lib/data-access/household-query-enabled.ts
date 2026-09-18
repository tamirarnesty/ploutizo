import type { AccessState } from '@/lib/access/access-state';
import { isHouseholdBearerReady } from '@/lib/access/household-loader-ready';

export const isHouseholdQueryBearerReady = (
  isReady: boolean,
  access: AccessState
): boolean => isHouseholdBearerReady(isReady, access);

/** Present bearer-pending queries as loading so route skeletons render during SSR/hydration. */
export const whileHouseholdBearerPending = <TResult extends { data: unknown }>(
  result: TResult
): TResult => ({
  ...result,
  data: undefined,
  isPending: true,
  isLoading: true,
  isFetching: false,
  isSuccess: false,
  isError: false,
  error: null,
  status: 'pending',
  fetchStatus: 'idle',
});
