import { activeImportDraftsQueryKey } from './queryKeys';
import type { QueryClient } from '@tanstack/react-query';

export const invalidateActiveImportDraftsQuery = (qc: QueryClient) => {
  void qc.invalidateQueries({ queryKey: activeImportDraftsQueryKey });
};
