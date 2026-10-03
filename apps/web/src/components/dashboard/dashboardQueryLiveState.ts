import type { UseQueryResult } from '@tanstack/react-query';

/** Query slice shared by dashboard cards that show loading, error, or cached data. */
export type DashboardQueryLiveStateInput = Pick<
  UseQueryResult<unknown>,
  'data' | 'isError' | 'isFetching' | 'isPending'
>;

export type DashboardQueryLiveStateOptions = {
  /**
   * When true (default), any in-flight fetch marks the card busy — used for charts
   * that dim while refetching. When false, busy only when there is no cached data
   * yet (first load or retry after a failed first load).
   */
  busyWhileRefetching?: boolean;
};

/**
 * Failed refetches keep cached data on screen; only a settled failed first load
 * shows the error.
 */
export const getDashboardQueryLiveState = (
  { data, isError, isFetching, isPending }: DashboardQueryLiveStateInput,
  { busyWhileRefetching = true }: DashboardQueryLiveStateOptions = {}
) => {
  const showError = isError && data === undefined && !isFetching;
  const waitingForInitialData = data === undefined && (isPending || isFetching);
  const isBusy =
    !showError &&
    (busyWhileRefetching
      ? isFetching || data === undefined
      : waitingForInitialData);

  return { showError, isBusy };
};

export const getCombinedDashboardQueryLiveState = (
  queries: DashboardQueryLiveStateInput[],
  options?: DashboardQueryLiveStateOptions
) => {
  const states = queries.map((query) =>
    getDashboardQueryLiveState(query, options)
  );

  return {
    showError: states.some((state) => state.showError),
    isBusy: states.some((state) => state.isBusy),
  };
};
