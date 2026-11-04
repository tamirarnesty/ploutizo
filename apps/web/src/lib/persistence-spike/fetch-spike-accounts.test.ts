import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Account } from '@ploutizo/validators';
import {
  SpikeAccountsApiBlockedError,
  fetchSpikeAccounts,
  isSpikeAccountsApiBlocked,
  resetSpikeAccountsApiBlockedForTests,
  setSpikeAccountsApiBlocked,
} from './fetch-spike-accounts';
import { assertBrowserPersistenceRuntime } from './spike-runtime';

const account = { id: 'acc_1', name: 'Checking' } as Account;

describe('persistence spike runtime', () => {
  afterEach(() => {
    resetSpikeAccountsApiBlockedForTests();
  });

  it('refuses to open the database during the server render', () => {
    expect(() => assertBrowserPersistenceRuntime(true)).toThrow(
      /only in the browser/i
    );
    expect(() => assertBrowserPersistenceRuntime(false)).not.toThrow();
  });

  it('does not call the accounts API when the spike blocks it', async () => {
    const fetchAccounts = vi.fn(() => Promise.resolve([account]));
    setSpikeAccountsApiBlocked(true);

    await expect(fetchSpikeAccounts(fetchAccounts)).rejects.toBeInstanceOf(
      SpikeAccountsApiBlockedError
    );
    expect(fetchAccounts).not.toHaveBeenCalled();
    expect(isSpikeAccountsApiBlocked()).toBe(true);
  });

  it('fetches active accounts when the spike allows the API', async () => {
    const fetchAccounts = vi.fn(() => Promise.resolve([account]));

    await expect(fetchSpikeAccounts(fetchAccounts)).resolves.toEqual([account]);
    expect(fetchAccounts).toHaveBeenCalledWith(false, undefined);
  });
});
