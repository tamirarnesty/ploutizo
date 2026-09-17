import { beforeEach, describe, expect, it } from 'vitest';
import {
  getAccessRouterContext,
  getAccessRouterContextServerSnapshot,
  publishAccessRouterContext,
  resetAccessRouterContextStoreForTests,
} from './access-router-context-store';
import {
  getActiveQueryClient,
  resetWorkingSetRegistryForTests,
} from './working-set-registry';

describe('access-router-context-store', () => {
  beforeEach(() => {
    resetWorkingSetRegistryForTests();
    resetAccessRouterContextStoreForTests();
  });

  it('returns a stable server snapshot reference for useSyncExternalStore', () => {
    const first = getAccessRouterContextServerSnapshot();
    const second = getAccessRouterContextServerSnapshot();

    expect(first).toBe(second);
  });

  it('publishes client router context updates', () => {
    publishAccessRouterContext({
      queryClient: getActiveQueryClient(),
      access: {
        status: 'signed-in-with-active-household',
        signedInMemberId: 'user_a',
        activeHouseholdId: 'org_a',
      },
      identityLoaded: true,
      isReady: true,
    });

    expect(getAccessRouterContext().isReady).toBe(true);
    expect(getAccessRouterContextServerSnapshot()).not.toBe(
      getAccessRouterContext()
    );
  });
});
