import { describe, expect, it } from 'vitest';
import { whileHouseholdBearerPending } from './household-query-enabled';

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
