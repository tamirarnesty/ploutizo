import { describe, expect, it } from 'vitest';
import {
  accountCreateRoute,
  accountsRoute,
  parseAccountCreateLocationState,
} from './account-create-route';

describe('accountCreateRoute', () => {
  it('hands off to Accounts through navigation state, not search params', () => {
    expect(accountCreateRoute('credit_card')).toEqual({
      to: '/accounts',
      state: { createAccount: { type: 'credit_card' } },
    });
    expect(accountsRoute).toEqual({ to: '/accounts' });
    expect(accountCreateRoute('investment')).not.toHaveProperty('search');
  });
});

describe('parseAccountCreateLocationState', () => {
  it('accepts a known account type', () => {
    expect(parseAccountCreateLocationState({ type: 'investment' })).toEqual({
      type: 'investment',
    });
  });

  it('ignores missing or invalid payloads', () => {
    expect(parseAccountCreateLocationState(undefined)).toBeUndefined();
    expect(parseAccountCreateLocationState({ type: 'other' })).toBeUndefined();
    expect(parseAccountCreateLocationState({ type: 1 })).toBeUndefined();
    expect(parseAccountCreateLocationState({})).toBeUndefined();
  });
});
