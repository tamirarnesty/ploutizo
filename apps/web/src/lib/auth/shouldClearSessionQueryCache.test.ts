import { describe, expect, it } from 'vitest';
import { shouldClearSessionQueryCache } from './shouldClearSessionQueryCache';

describe('shouldClearSessionQueryCache', () => {
  it('holds the previous snapshot while Clerk is still loading', () => {
    expect(shouldClearSessionQueryCache(false, 'user_a', undefined)).toEqual({
      shouldClear: false,
      nextUserId: 'user_a',
    });
  });

  it('records the first loaded user without clearing', () => {
    expect(shouldClearSessionQueryCache(true, undefined, 'user_a')).toEqual({
      shouldClear: false,
      nextUserId: 'user_a',
    });
  });

  it('records a first loaded signed-out snapshot without clearing', () => {
    expect(shouldClearSessionQueryCache(true, undefined, null)).toEqual({
      shouldClear: false,
      nextUserId: null,
    });
  });

  it('treats an undefined loaded userId as signed out', () => {
    expect(shouldClearSessionQueryCache(true, undefined, undefined)).toEqual({
      shouldClear: false,
      nextUserId: null,
    });
  });

  it('does not clear when the same user stays signed in', () => {
    expect(shouldClearSessionQueryCache(true, 'user_a', 'user_a')).toEqual({
      shouldClear: false,
      nextUserId: 'user_a',
    });
  });

  it('clears when the user signs out', () => {
    expect(shouldClearSessionQueryCache(true, 'user_a', null)).toEqual({
      shouldClear: true,
      nextUserId: null,
    });
  });

  it('clears when a different account signs in after logout', () => {
    expect(shouldClearSessionQueryCache(true, null, 'user_b')).toEqual({
      shouldClear: true,
      nextUserId: 'user_b',
    });
  });

  it('clears when the signed-in account changes without an intermediate null', () => {
    expect(shouldClearSessionQueryCache(true, 'user_a', 'user_b')).toEqual({
      shouldClear: true,
      nextUserId: 'user_b',
    });
  });
});
