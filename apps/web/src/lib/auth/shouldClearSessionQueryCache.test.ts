import { describe, expect, it } from 'vitest';
import { shouldClearSessionQueryCache } from './shouldClearSessionQueryCache';
import type { CacheIdentity } from './access-policy';

const alexA: CacheIdentity = {
  signedInMemberId: 'user_alex',
  activeHouseholdId: 'org_a',
};
const alexB: CacheIdentity = {
  signedInMemberId: 'user_alex',
  activeHouseholdId: 'org_b',
};
const samA: CacheIdentity = {
  signedInMemberId: 'user_sam',
  activeHouseholdId: 'org_a',
};
const signedOut: CacheIdentity = {
  signedInMemberId: null,
  activeHouseholdId: null,
};

describe('shouldClearSessionQueryCache', () => {
  it('holds the previous snapshot while Clerk is still loading', () => {
    expect(shouldClearSessionQueryCache(false, alexA, signedOut)).toEqual({
      shouldClear: false,
      nextIdentity: alexA,
    });
  });

  it('records the first loaded identity without clearing', () => {
    expect(shouldClearSessionQueryCache(true, undefined, alexA)).toEqual({
      shouldClear: false,
      nextIdentity: alexA,
    });
  });

  it('does not lock in a signed-out snapshot as the first identity', () => {
    expect(shouldClearSessionQueryCache(true, undefined, signedOut)).toEqual({
      shouldClear: false,
      nextIdentity: undefined,
    });
  });

  it('does not clear when the signed-in member and active household stay the same', () => {
    expect(shouldClearSessionQueryCache(true, alexA, alexA)).toEqual({
      shouldClear: false,
      nextIdentity: alexA,
    });
  });

  it('keeps the previous snapshot object when identity values are unchanged', () => {
    const sameAsAlexA: CacheIdentity = {
      signedInMemberId: 'user_alex',
      activeHouseholdId: 'org_a',
    };
    expect(shouldClearSessionQueryCache(true, alexA, sameAsAlexA)).toEqual({
      shouldClear: false,
      nextIdentity: alexA,
    });
  });

  it('clears when the signed-in member signs out', () => {
    expect(shouldClearSessionQueryCache(true, alexA, signedOut)).toEqual({
      shouldClear: true,
      nextIdentity: signedOut,
    });
  });

  it('clears when a different signed-in member signs in', () => {
    expect(shouldClearSessionQueryCache(true, signedOut, samA)).toEqual({
      shouldClear: true,
      nextIdentity: samA,
    });
  });

  it('clears when the active household changes for the same signed-in member', () => {
    expect(shouldClearSessionQueryCache(true, alexA, alexB)).toEqual({
      shouldClear: true,
      nextIdentity: alexB,
    });
  });
});
