import { describe, expect, it } from 'vitest';
import {
  getCombinedDashboardQueryLiveState,
  getDashboardQueryLiveState,
} from './dashboardQueryLiveState';

describe('getDashboardQueryLiveState', () => {
  it('is busy on first load', () => {
    expect(
      getDashboardQueryLiveState({
        data: undefined,
        isError: false,
        isFetching: true,
      })
    ).toEqual({ showError: false, isBusy: true });
  });

  it('shows error after a failed first load settles', () => {
    expect(
      getDashboardQueryLiveState({
        data: undefined,
        isError: true,
        isFetching: false,
      })
    ).toEqual({ showError: true, isBusy: false });
  });

  it('is busy while retrying after a failed first load', () => {
    expect(
      getDashboardQueryLiveState({
        data: undefined,
        isError: true,
        isFetching: true,
      })
    ).toEqual({ showError: false, isBusy: true });
  });

  it('is busy while refetching when busyWhileRefetching is true', () => {
    expect(
      getDashboardQueryLiveState({
        data: { ok: true },
        isError: false,
        isFetching: true,
      })
    ).toEqual({ showError: false, isBusy: true });
  });

  it('combines multiple queries with OR semantics', () => {
    expect(
      getCombinedDashboardQueryLiveState([
        {
          data: { ok: true },
          isError: false,
          isFetching: false,
        },
        {
          data: undefined,
          isError: false,
          isFetching: true,
        },
      ])
    ).toEqual({ showError: false, isBusy: true });
  });

  it('is not busy while refetching cached data when busyWhileRefetching is false', () => {
    expect(
      getDashboardQueryLiveState(
        {
          data: { ok: true },
          isError: false,
          isFetching: true,
        },
        { busyWhileRefetching: false }
      )
    ).toEqual({ showError: false, isBusy: false });
  });
});
