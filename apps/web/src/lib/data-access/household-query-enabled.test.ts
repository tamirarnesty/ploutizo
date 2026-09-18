import { describe, expect, it } from 'vitest';
import type { AccessState } from '@/lib/access/access-state';
import {
  isHouseholdQueryBearerReady,
  whileHouseholdBearerPending,
} from './household-query-enabled';

const householdAccess: AccessState = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_a',
  activeHouseholdId: 'org_a',
};

describe('isHouseholdQueryBearerReady', () => {
  it('is false before household bearer is ready', () => {
    expect(isHouseholdQueryBearerReady(false, householdAccess)).toBe(false);
  });

  it('is true when household bearer is ready', () => {
    expect(isHouseholdQueryBearerReady(true, householdAccess)).toBe(true);
  });

  it('is false for signed-out access even when ready', () => {
    expect(isHouseholdQueryBearerReady(true, { status: 'signed-out' })).toBe(
      false
    );
  });

  it('is false for signed-in members without an active household', () => {
    expect(
      isHouseholdQueryBearerReady(true, {
        status: 'signed-in-no-household',
        signedInMemberId: 'user_a',
      })
    ).toBe(false);
  });
});

describe('whileHouseholdBearerPending', () => {
  it('masks disabled query results as loading while bearer is pending', () => {
    const pending = whileHouseholdBearerPending({
      data: { accounts: [] },
      isPending: false,
      isLoading: false,
      isFetching: false,
      isSuccess: true,
      isError: false,
      error: null,
      status: 'success',
      fetchStatus: 'idle',
    });

    expect(pending.data).toBeUndefined();
    expect(pending.isLoading).toBe(true);
    expect(pending.isPending).toBe(true);
    expect(pending.isSuccess).toBe(false);
    expect(pending.status).toBe('pending');
  });
});
