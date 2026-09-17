import { describe, expect, it, vi } from 'vitest';
import { claimsMatchAccess } from './bearer-claims';
import { resolveTransitionBearer } from './resolve-transition-bearer';
import type { AccessState } from './access-state';

const alexInHouseholdA: AccessState = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_alex',
  activeHouseholdId: 'org_a',
};

const unsignedJwt = (payload: Record<string, unknown>) => {
  const body = btoa(JSON.stringify(payload))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  return `hdr.${body}.sig`;
};

describe('resolveTransitionBearer', () => {
  it('requests a fresh token and verifies claims on identity transition', async () => {
    const matchingToken = unsignedJwt({ sub: 'user_alex', org_id: 'org_a' });
    const getToken = vi.fn((options?: { skipCache?: boolean }) =>
      Promise.resolve(options?.skipCache ? matchingToken : null)
    );

    await expect(
      resolveTransitionBearer(getToken, alexInHouseholdA)
    ).resolves.toBe(matchingToken);
    expect(getToken).toHaveBeenCalledWith({ skipCache: true });
  });

  it('rejects a fresh token whose claims do not match access', async () => {
    const staleToken = unsignedJwt({ sub: 'user_alex', org_id: 'org_old' });
    const getToken = vi.fn(() => Promise.resolve(staleToken));

    await expect(
      resolveTransitionBearer(getToken, alexInHouseholdA)
    ).resolves.toBeNull();
    expect(getToken).toHaveBeenCalledWith({ skipCache: true });
  });
});

describe('claimsMatchAccess', () => {
  it('requires both signed-in member and active household claims', () => {
    const token = unsignedJwt({ sub: 'user_alex', org_id: 'org_a' });
    expect(claimsMatchAccess(token, alexInHouseholdA)).toBe(true);
  });
});
