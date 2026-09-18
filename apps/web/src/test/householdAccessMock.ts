import { vi } from 'vitest';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';

export const householdAccessProviderMock = {
  useAccess: () => ({
    isReady: true,
    bearerError: false,
    retryBearer: vi.fn(),
    identityLoaded: true,
    access: {
      status: 'signed-in-with-active-household' as const,
      signedInMemberId: 'user_a',
      activeHouseholdId: 'org_a',
    },
    queryClient: getActiveQueryClient(),
  }),
};
