import { afterEach, describe, expect, it } from 'vitest';
import { clearSessionQueryCache, queryClient } from './queryClient';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('clearSessionQueryCache', () => {
  afterEach(() => {
    queryClient.clear();
  });

  it('empties cached queries so the next session cannot read prior data', () => {
    queryClient.setQueryData(['transactions'], [{ id: 'txn_prior' }]);
    queryClient.setQueryData(['household-overview'], {
      name: 'Prior household',
    });
    queryClient.setQueryData(['accounts'], [{ id: 'acct_prior' }]);

    clearSessionQueryCache();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(queryClient.getQueryData(['transactions'])).toBeUndefined();
    expect(queryClient.getQueryData(['household-overview'])).toBeUndefined();
    expect(queryClient.getQueryData(['accounts'])).toBeUndefined();
  });

  it('does not restore a late in-flight response after the session is cleared', async () => {
    const pending = deferred<{ id: string }[]>();
    const fetchPromise = queryClient.fetchQuery({
      queryKey: ['transactions'],
      queryFn: () => pending.promise,
    });

    clearSessionQueryCache();
    pending.resolve([{ id: 'txn_prior' }]);
    await fetchPromise.catch(() => undefined);

    expect(queryClient.getQueryData(['transactions'])).toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});
