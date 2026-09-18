import { afterEach, describe, expect, it } from 'vitest';
import {
  getActiveQueryClient,
  replaceActiveWorkingSet,
  resetWorkingSetRegistryForTests,
} from '@/lib/access/working-set-registry';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('replaceActiveWorkingSet', () => {
  afterEach(() => {
    resetWorkingSetRegistryForTests();
  });

  it('empties cached queries so the next working set cannot read prior data', () => {
    const priorClient = getActiveQueryClient();
    priorClient.setQueryData(['transactions'], [{ id: 'txn_prior' }]);
    priorClient.setQueryData(['accounts'], [{ id: 'acct_prior' }]);

    replaceActiveWorkingSet();

    expect(priorClient.getQueryCache().getAll()).toHaveLength(0);
    expect(
      getActiveQueryClient().getQueryData(['transactions'])
    ).toBeUndefined();
    expect(getActiveQueryClient().getQueryData(['accounts'])).toBeUndefined();
  });

  it('does not restore a late in-flight response after the working set is discarded', async () => {
    const priorClient = getActiveQueryClient();
    const pending = deferred<{ id: string }[]>();
    const fetchPromise = priorClient.fetchQuery({
      queryKey: ['transactions'],
      queryFn: () => pending.promise,
    });

    replaceActiveWorkingSet();
    pending.resolve([{ id: 'txn_prior' }]);
    await fetchPromise.catch(() => undefined);

    expect(priorClient.getQueryData(['transactions'])).toBeUndefined();
    expect(
      getActiveQueryClient().getQueryData(['transactions'])
    ).toBeUndefined();
  });
});
