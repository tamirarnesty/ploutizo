import './working-set-cleanup';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { accessKey } from './access-key';
import {
  getActiveWorkingSet,
  resetWorkingSetRegistryForTests,
} from './working-set-registry';
import { useAccessSnapshotLifecycle } from './use-access-snapshot-lifecycle';
import type { AccessState } from './access-state';

const calls = vi.hoisted(() => ({
  accesses: [] as AccessState[],
  workingSetIds: [] as number[],
}));

vi.mock('@/lib/persistence/browser-persistence', async () => {
  const registry = await import('@/lib/access/working-set-registry');
  return {
    syncBrowserPersistence: (access: AccessState) => {
      calls.accesses.push(access);
      calls.workingSetIds.push(registry.getActiveWorkingSet().id);
      return Promise.resolve();
    },
  };
});

const signedOut: AccessState = { status: 'signed-out' };

const alexInHouseholdA: AccessState = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_alex',
  activeHouseholdId: 'org_a',
};

const alexInHouseholdB: AccessState = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_alex',
  activeHouseholdId: 'org_b',
};

const getToken = (): Promise<string | null> => Promise.resolve(null);

const renderLifecycle = (access: AccessState, isLoaded: boolean) =>
  renderHook(
    (props: {
      access: AccessState;
      isLoaded: boolean;
      token: typeof getToken;
    }) =>
      useAccessSnapshotLifecycle({
        isLoaded: props.isLoaded,
        access: props.access,
        currentAccessKey: accessKey(props.access),
        getToken: props.token,
        retryCount: 0,
      }),
    {
      initialProps: { access, isLoaded, token: getToken },
    }
  );

describe('useAccessSnapshotLifecycle browser persistence', () => {
  beforeEach(() => {
    resetWorkingSetRegistryForTests();
    calls.accesses = [];
    calls.workingSetIds = [];
  });

  it('does not sync while Clerk is still loading', () => {
    renderLifecycle(signedOut, false);

    expect(calls.accesses).toEqual([]);
  });

  it('wipes once a resolved signed-out session is known', () => {
    const { rerender } = renderLifecycle(signedOut, false);

    rerender({ access: signedOut, isLoaded: true, token: getToken });

    expect(calls.accesses).toEqual([signedOut]);
  });

  it('opens the active household and syncs again when identity changes', () => {
    const viewed = renderLifecycle(alexInHouseholdA, true);
    const workingSetBeforeSwitch = getActiveWorkingSet().id;

    viewed.rerender({
      access: alexInHouseholdA,
      isLoaded: true,
      token: () => Promise.resolve('next-token'),
    });
    viewed.rerender({
      access: alexInHouseholdB,
      isLoaded: true,
      token: getToken,
    });
    viewed.rerender({
      access: signedOut,
      isLoaded: true,
      token: getToken,
    });

    expect(calls.accesses).toEqual([
      alexInHouseholdA,
      alexInHouseholdB,
      signedOut,
    ]);
    expect(calls.workingSetIds).toEqual([
      workingSetBeforeSwitch,
      workingSetBeforeSwitch + 1,
      workingSetBeforeSwitch + 2,
    ]);
  });
});
