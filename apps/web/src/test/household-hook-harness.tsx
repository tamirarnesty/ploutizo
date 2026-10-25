import { QueryClientProvider } from '@tanstack/react-query';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import type { ReactNode } from 'react';

/** Vitest only hoists `vi.mock` from the test module — add the AccessProvider mock from `householdAccessMock.ts` in each test file. */
export const HouseholdHookWrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={getActiveQueryClient()}>
    {children}
  </QueryClientProvider>
);
