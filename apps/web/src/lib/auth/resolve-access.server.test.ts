import { afterEach, describe, expect, it, vi } from 'vitest';

const pageRequest = new Request('http://localhost:3000/dashboard');
const setResponseHeader = vi.fn();

vi.mock('@clerk/tanstack-react-start/server', () => ({
  auth: () =>
    Promise.resolve({
      isAuthenticated: true,
      userId: 'user_a',
      orgId: 'org_a',
      getToken: () => Promise.resolve('page-jwt'),
    }),
}));

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () => pageRequest,
  setResponseHeader: (...args: unknown[]) => setResponseHeader(...args),
}));

describe('resolveAccessOnRequest', () => {
  afterEach(() => {
    vi.resetModules();
    setResponseHeader.mockClear();
  });

  it('binds the bearer on the same request apiFetch will read and never returns it as access', async () => {
    const { resolveAccessOnRequest } = await import('./resolve-access.server');
    const { getRequestBearer } = await import('./request-bearer.server');

    const result = await resolveAccessOnRequest();

    expect(result.access).toEqual({
      status: 'signed-in-with-active-household',
      signedInMemberId: 'user_a',
      activeHouseholdId: 'org_a',
    });
    expect(result.access).not.toHaveProperty('bearerToken');
    expect(result.requestBearer).toBe('page-jwt');
    expect(getRequestBearer()).toBe('page-jwt');
    expect(setResponseHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store'
    );
  });
});
