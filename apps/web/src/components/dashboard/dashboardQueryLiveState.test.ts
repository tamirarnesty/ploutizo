import { describe, expect, it } from 'vitest';
import {
  getCombinedDashboardQueryLiveState,
  getDashboardQueryLiveState,
} from './dashboardQueryLiveState';

const pendingIdle = {
  isPending: false,
  isFetching: false,
  isError: false,
};

describe('getDashboardQueryLiveState', () => {
  it('is busy on first load', () => {
    expect(
      getDashboardQueryLiveState({
        ...pendingIdle,
        data: undefined,
        isFetching: true,
        isPending: true,
      })
    ).toEqual({ showError: false, isBusy: true });
  });

  it('is busy while pending before the first fetch starts', () => {
    expect(
      getDashboardQueryLiveState(
        {
          ...pendingIdle,
          data: undefined,
          isPending: true,
        },
        { busyWhileRefetching: false }
      )
    ).toEqual({ showError: false, isBusy: true });
  });

  it('shows error after a failed first load settles', () => {
    expect(
      getDashboardQueryLiveState({
        ...pendingIdle,
        data: undefined,
        isError: true,
      })
    ).toEqual({ showError: true, isBusy: false });
  });

  it('is busy while retrying after a failed first load', () => {
    expect(
      getDashboardQueryLiveState({
        ...pendingIdle,
        data: undefined,
        isError: true,
        isFetching: true,
        isPending: true,
      })
    ).toEqual({ showError: false, isBusy: true });
  });

  it('is busy while refetching when busyWhileRefetching is true', () => {
    expect(
      getDashboardQueryLiveState({
        ...pendingIdle,
        data: { ok: true },
        isFetching: true,
      })
    ).toEqual({ showError: false, isBusy: true });
  });

  it('combines multiple queries with OR semantics', () => {
    expect(
      getCombinedDashboardQueryLiveState([
        {
          ...pendingIdle,
          data: { ok: true },
        },
        {
          ...pendingIdle,
          data: undefined,
          isFetching: true,
          isPending: true,
        },
      ])
    ).toEqual({ showError: false, isBusy: true });
  });

  it('is not busy while refetching cached data when busyWhileRefetching is false', () => {
    expect(
      getDashboardQueryLiveState(
        {
          ...pendingIdle,
          data: { ok: true },
          isFetching: true,
        },
        { busyWhileRefetching: false }
      )
    ).toEqual({ showError: false, isBusy: false });
  });
});
