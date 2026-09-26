import { importTargetsQueryKey } from './queryKeys';
import type { QueryClient } from '@tanstack/react-query';

/** Import targets mirror credit-card accounts; refresh when accounts change. */
export const invalidateImportTargetsQuery = (qc: QueryClient) => {
  void qc.invalidateQueries({ queryKey: importTargetsQueryKey });
};
