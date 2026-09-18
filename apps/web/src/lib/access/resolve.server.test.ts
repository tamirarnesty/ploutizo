import { afterEach, describe, expect, it, vi } from 'vitest';

const householdAJwt = vi.hoisted(() => {
  const body = btoa(JSON.stringify({ sub: 'user_a', org_id: 'org_a' }))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  return `hdr.${body}.sig`;
});

const setResponseHeader = vi.fn();

describe('getRequestAccess', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('@clerk/tanstack-react-start/server');
  });

  it('maps Clerk auth into access state', async () => {
    vi.doMock('@clerk/tanstack-react-start/server', () => ({
      auth: () =>
        Promise.resolve({
          isAuthenticated: true,
          userId: 'user_a',
          orgId: 'org_a',
          getToken: () => Promise.resolve(householdAJwt),
        }),
    }));

    const { getRequestAccess } = await import('./resolve.server');

    await expect(getRequestAccess()).resolves.toEqual({
      status: 'signed-in-with-active-household',
      signedInMemberId: 'user_a',
      activeHouseholdId: 'org_a',
    });
  });
});

describe('getRequestHouseholdBearer', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('@clerk/tanstack-react-start/server');
    setResponseHeader.mockClear();
  });

  it('returns a claim-matching bearer for authenticated household requests', async () => {
    vi.doMock('@clerk/tanstack-react-start/server', () => ({
      auth: () =>
        Promise.resolve({
          isAuthenticated: true,
          userId: 'user_a',
          orgId: 'org_a',
          getToken: () => Promise.resolve(householdAJwt),
        }),
    }));
    vi.doMock('@tanstack/react-start/server', () => ({
      setResponseHeader: (...args: unknown[]) => setResponseHeader(...args),
    }));

    const { getRequestHouseholdBearer } = await import('./resolve.server');

    await expect(getRequestHouseholdBearer()).resolves.toBe(householdAJwt);
    expect(setResponseHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store'
    );
  });

  it('returns null when the Clerk token does not match the active household', async () => {
    vi.doMock('@clerk/tanstack-react-start/server', () => ({
      auth: () =>
        Promise.resolve({
          isAuthenticated: true,
          userId: 'user_a',
          orgId: 'org_b',
          getToken: () => Promise.resolve(householdAJwt),
        }),
    }));
    vi.doMock('@tanstack/react-start/server', () => ({
      setResponseHeader: (...args: unknown[]) => setResponseHeader(...args),
    }));

    const { getRequestHouseholdBearer } = await import('./resolve.server');

    await expect(getRequestHouseholdBearer()).resolves.toBeNull();
  });
});
