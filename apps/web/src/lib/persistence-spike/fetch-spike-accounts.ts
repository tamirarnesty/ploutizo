import type { Account } from '@ploutizo/validators';

export class SpikeAccountsApiBlockedError extends Error {
  constructor() {
    super('PLO-134 spike blocked the accounts API');
    this.name = 'SpikeAccountsApiBlockedError';
  }
}

let accountsApiBlocked = false;

export const setSpikeAccountsApiBlocked = (blocked: boolean) => {
  accountsApiBlocked = blocked;
};

export const isSpikeAccountsApiBlocked = () => accountsApiBlocked;

export const resetSpikeAccountsApiBlockedForTests = () => {
  accountsApiBlocked = false;
};

export const fetchSpikeAccounts = (
  fetchAccounts: (
    includeArchived?: boolean,
    signal?: AbortSignal
  ) => Promise<Account[]>,
  signal?: AbortSignal
): Promise<Account[]> => {
  if (accountsApiBlocked) {
    return Promise.reject(new SpikeAccountsApiBlockedError());
  }
  return fetchAccounts(false, signal);
};
