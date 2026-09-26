import { dashboardOverviewQueryKey } from '@/lib/data-access/dashboard/useGetDashboardOverview';
import type { QueryClient } from '@tanstack/react-query';

/** Every query derived from transactions: lists, settlement balances, and the spend trend. */
export const invalidateSpendQueries = (queryClient: QueryClient): void => {
  void queryClient.invalidateQueries({ queryKey: ['transactions'] });
  void queryClient.invalidateQueries({ queryKey: ['settlements'] });
  void queryClient.invalidateQueries({ queryKey: dashboardOverviewQueryKey });
};
