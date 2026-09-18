import { QueryClientProvider } from '@tanstack/react-query';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import type { ReactNode } from 'react';

/** Query client wrapper for data-access hook tests. Also add the AccessProvider mock from householdAccessMock.ts in the test file (Vitest only hoists vi.mock from the test module). */
export const HouseholdHookWrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={getActiveQueryClient()}>
    {children}
  </QueryClientProvider>
);
