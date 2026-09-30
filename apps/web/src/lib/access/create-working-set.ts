import { QueryClient } from '@tanstack/react-query';
import { shouldRetryApiRequest } from '@/lib/queryClient';

export type WorkingSet = {
  id: number;
  queryClient: QueryClient;
  dispose: () => void;
};

let nextWorkingSetId = 1;

export const createWorkingSet = (): WorkingSet => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60,
        retry: shouldRetryApiRequest,
      },
    },
  });

  const id = nextWorkingSetId++;

  return {
    id,
    queryClient,
    dispose: () => {
      void queryClient.cancelQueries();
      queryClient.clear();
    },
  };
};

export const resetWorkingSetIdsForTests = () => {
  nextWorkingSetId = 1;
};
