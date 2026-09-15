import { afterEach, describe, expect, it, vi } from 'vitest';

const pageRequest = new Request('http://localhost:3000/dashboard');

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
}));

describe('ensureAccessOnRequest', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('binds the bearer on the same request apiFetch will read', async () => {
    const { ensureAccessOnRequest } = await import('./ensure-access.server');
    const { getRequestBearer } = await import('./request-bearer.server');

    const result = await ensureAccessOnRequest('active-household');

    expect(result).toEqual({
      access: {
        status: 'signed-in-with-active-household',
        signedInMemberId: 'user_a',
        activeHouseholdId: 'org_a',
      },
      bearerToken: 'page-jwt',
    });
    expect(getRequestBearer()).toBe('page-jwt');
  });
});
