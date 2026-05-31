import { describe, expect, it } from 'vitest';
import type { Account } from '@ploutizo/types';
import {
  getSettlementSourceAccounts,
  isSettlementSourceAccount,
} from './settlementSourceAccounts';

const cardId = '11111111-1111-1111-1111-111111111111';

const account = (
  overrides: Partial<Account> & Pick<Account, 'id' | 'type'>
): Account =>
  ({
    name: 'Test',
    owners: [],
    archivedAt: null,
    institution: null,
    lastFour: null,
    ...overrides,
  }) as Account;

describe('settlementSourceAccounts', () => {
  it('excludes the card being settled and archived accounts', () => {
    const chequing = account({
      id: '22222222-2222-2222-2222-222222222222',
      type: 'chequing',
    });
    const card = account({ id: cardId, type: 'credit_card' });
    const archived = account({
      id: '33333333-3333-3333-3333-333333333333',
      type: 'savings',
      archivedAt: '2026-01-01',
    });

    expect(isSettlementSourceAccount(chequing, cardId)).toBe(true);
    expect(isSettlementSourceAccount(card, cardId)).toBe(false);
    expect(isSettlementSourceAccount(archived, cardId)).toBe(false);
  });

  it('returns only allowed source types', () => {
    const sources = getSettlementSourceAccounts(
      [
        account({
          id: '22222222-2222-2222-2222-222222222222',
          type: 'chequing',
        }),
        account({ id: cardId, type: 'credit_card' }),
        account({
          id: '44444444-4444-4444-4444-444444444444',
          type: 'investment',
        }),
      ],
      cardId
    );

    expect(sources).toHaveLength(1);
    expect(sources[0]?.type).toBe('chequing');
  });
});
