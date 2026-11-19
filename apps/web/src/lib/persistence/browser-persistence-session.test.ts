import { describe, expect, it, vi } from 'vitest';
import type { AccessState } from '@/lib/access/access-state';
import { browserDatabaseName } from './browser-database-scope';
import { createBrowserPersistenceSession } from './browser-persistence-session';
import type { BrowserPersistenceTarget } from './browser-persistence-session';

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

const blairInHouseholdA: AccessState = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_blair',
  activeHouseholdId: 'org_a',
};

const nameOf = (access: AccessState) => {
  if (access.status !== 'signed-in-with-active-household') {
    throw new Error('expected an active household');
  }
  return browserDatabaseName({
    signedInMemberId: access.signedInMemberId,
    activeHouseholdId: access.activeHouseholdId,
  });
};

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const createRuntime = () => {
  const closes: string[] = [];
  const open = vi.fn((target: BrowserPersistenceTarget) =>
    Promise.resolve({
      persistence: { databaseName: target.databaseName },
      close: () => {
        closes.push(target.databaseName);
        return Promise.resolve();
      },
    })
  );
  const wipeAll = vi.fn(() => Promise.resolve());
  const session = createBrowserPersistenceSession({ open, wipeAll });
  return { session, open, wipeAll, closes };
};

describe('browser persistence session', () => {
  it('opens a different database for each member and household without deleting the previous file', async () => {
    const { session, open, wipeAll, closes } = createRuntime();

    await session.sync(alexInHouseholdA);
    await session.sync(alexInHouseholdB);
    await session.sync(blairInHouseholdA);

    expect(open.mock.calls.map(([target]) => target)).toEqual([
      {
        databaseName: nameOf(alexInHouseholdA),
        coordinatorName: nameOf(alexInHouseholdA),
      },
      {
        databaseName: nameOf(alexInHouseholdB),
        coordinatorName: nameOf(alexInHouseholdB),
      },
      {
        databaseName: nameOf(blairInHouseholdA),
        coordinatorName: nameOf(blairInHouseholdA),
      },
    ]);
    expect(closes).toEqual([
      nameOf(alexInHouseholdA),
      nameOf(alexInHouseholdB),
    ]);
    expect(wipeAll).not.toHaveBeenCalled();
    await expect(session.current()).resolves.toEqual({
      databaseName: nameOf(blairInHouseholdA),
    });
  });

  it('reopens the same database when the member returns to a household', async () => {
    const { session, open, wipeAll, closes } = createRuntime();

    await session.sync(alexInHouseholdA);
    await session.sync(alexInHouseholdB);
    await session.sync(alexInHouseholdA);

    expect(open.mock.calls.map(([target]) => target.databaseName)).toEqual([
      nameOf(alexInHouseholdA),
      nameOf(alexInHouseholdB),
      nameOf(alexInHouseholdA),
    ]);
    expect(closes).toEqual([
      nameOf(alexInHouseholdA),
      nameOf(alexInHouseholdB),
    ]);
    expect(wipeAll).not.toHaveBeenCalled();
  });

  it('closes the database without deleting it when the member has no active household', async () => {
    const { session, wipeAll, closes } = createRuntime();

    await session.sync(alexInHouseholdA);
    await session.sync({
      status: 'signed-in-no-household',
      signedInMemberId: 'user_alex',
    });

    expect(closes).toEqual([nameOf(alexInHouseholdA)]);
    expect(wipeAll).not.toHaveBeenCalled();
    await expect(session.current()).resolves.toBeNull();
  });

  it('wipes every persisted database on sign-out', async () => {
    const { session, open, wipeAll, closes } = createRuntime();

    await session.sync(alexInHouseholdA);
    await session.sync({ status: 'signed-out' });
    await session.sync({ status: 'signed-out' });

    expect(closes).toEqual([nameOf(alexInHouseholdA)]);
    expect(wipeAll).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledTimes(1);
    await expect(session.current()).resolves.toBeNull();
  });

  it('wipes leftover files when the resolved session is already signed out', async () => {
    const { session, open, wipeAll } = createRuntime();

    await session.sync({ status: 'signed-out' });

    expect(wipeAll).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
  });

  it('wipes on sign-out when closing the open database fails', async () => {
    const wipeAll = vi.fn(() => Promise.resolve());
    const session = createBrowserPersistenceSession({
      open: (target) =>
        Promise.resolve({
          persistence: { databaseName: target.databaseName },
          close: () => Promise.reject(new Error('close failed')),
        }),
      wipeAll,
    });

    await session.sync(alexInHouseholdA);
    await expect(session.sync({ status: 'signed-out' })).rejects.toThrow(
      'close failed'
    );
    expect(wipeAll).toHaveBeenCalledTimes(1);
  });

  it('drops an in-flight open when the member signs out before it finishes', async () => {
    type OpenHandle = {
      persistence: { databaseName: string };
      close: () => Promise<void>;
    };
    const pending: ((handle: OpenHandle) => void)[] = [];
    const closes: string[] = [];
    const wipeAll = vi.fn(() => Promise.resolve());
    const session = createBrowserPersistenceSession({
      open: () =>
        new Promise<OpenHandle>((resolve) => {
          pending.push(resolve);
        }),
      wipeAll,
    });

    const opening = session.sync(alexInHouseholdA);
    await Promise.resolve();
    await Promise.resolve();
    expect(pending).toHaveLength(1);

    const signingOut = session.sync({ status: 'signed-out' });
    pending[0]({
      persistence: { databaseName: nameOf(alexInHouseholdA) },
      close: () => {
        closes.push(nameOf(alexInHouseholdA));
        return Promise.resolve();
      },
    });

    await opening;
    await signingOut;

    expect(closes).toEqual([nameOf(alexInHouseholdA)]);
    expect(wipeAll).toHaveBeenCalledTimes(1);
    await expect(session.current()).resolves.toBeNull();
  });

  it('waits for a collection release before closing the database', async () => {
    const { session, open, closes } = createRuntime();
    await session.sync(alexInHouseholdA);

    const release = deferred();
    const switching = session.sync(alexInHouseholdB);
    session.trackRelease(release.promise);
    await Promise.resolve();
    await Promise.resolve();

    expect(closes).toEqual([]);
    expect(open).toHaveBeenCalledTimes(1);

    release.resolve();
    await switching;

    expect(closes).toEqual([nameOf(alexInHouseholdA)]);
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('does not open a database for an unsafe scope id', async () => {
    const { session, open, wipeAll } = createRuntime();

    await session.sync({
      status: 'signed-in-with-active-household',
      signedInMemberId: 'user_alex/other',
      activeHouseholdId: 'org_a',
    });

    expect(open).not.toHaveBeenCalled();
    expect(wipeAll).not.toHaveBeenCalled();
    await expect(session.current()).resolves.toBeNull();
  });
});
