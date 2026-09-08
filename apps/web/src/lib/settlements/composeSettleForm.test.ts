import { describe, expect, it } from 'vitest';
import {
  defaultSettlementMembers,
  defaultSettlementSourceAccounts,
  mockFundingAccount,
  mockSettlementAccountRow,
} from '@/test/settlementFixtures';
import {
  composeSettleAmountForPayToward,
  composeSettleFormValues,
} from './composeSettleForm';

const fixture = mockSettlementAccountRow;
const sourceAccounts = defaultSettlementSourceAccounts;
const account = mockFundingAccount;

describe('composeSettleFormValues', () => {
  it('uses explicit member pay-toward and prefill from personal balance', () => {
    const v = composeSettleFormValues(
      fixture(),
      sourceAccounts,
      '2026-01-05',
      'alice'
    );
    expect(v.payToward).toBe('alice');
    expect(v.amountDollars).toBe(0);
    expect(v.sourceAccountId).toBe('bank-alice');
    expect(v.date).toBe('2026-01-05');
    expect(v.notes).toBe('');
  });

  it('prefills positive personal balance for selected member', () => {
    const v = composeSettleFormValues(
      fixture(),
      sourceAccounts,
      '2026-01-05',
      'betty'
    );
    expect(v.payToward).toBe('betty');
    expect(v.amountDollars).toBe(5);
  });

  it('shared pay-toward prefill uses shared balance and joint paid-from default', () => {
    const v = composeSettleFormValues(
      fixture(),
      sourceAccounts,
      '2026-01-05',
      'shared'
    );
    expect(v.payToward).toBe('shared');
    expect(v.amountDollars).toBe(2);
    expect(v.sourceAccountId).toBe('bank-joint');
  });

  it('falls back to the first allowed source when the member has no sole-owned account', () => {
    const v = composeSettleFormValues(
      fixture(),
      sourceAccounts,
      '2026-01-05',
      'betty'
    );
    expect(v.sourceAccountId).toBe('bank-alice');
  });

  it('prefers joint chequing over other joint funding accounts for shared', () => {
    const v = composeSettleFormValues(
      fixture(),
      [
        account({
          id: 'joint-savings',
          name: 'Joint Savings',
          type: 'savings',
          owners: [
            defaultSettlementMembers.alice,
            defaultSettlementMembers.betty,
          ],
        }),
        ...sourceAccounts,
      ],
      '2026-01-05',
      'shared'
    );
    expect(v.sourceAccountId).toBe('bank-joint');
  });

  it('uses any joint funding account when there is no joint chequing', () => {
    const v = composeSettleFormValues(
      fixture(),
      [
        account({
          id: 'bank-alice',
          name: 'Alice Chequing',
          type: 'chequing',
          owners: [defaultSettlementMembers.alice],
        }),
        account({
          id: 'joint-savings',
          name: 'Joint Savings',
          type: 'savings',
          owners: [
            defaultSettlementMembers.alice,
            defaultSettlementMembers.betty,
          ],
        }),
      ],
      '2026-01-05',
      'shared'
    );
    expect(v.sourceAccountId).toBe('joint-savings');
  });

  it('falls back to the first allowed source when shared has no joint account', () => {
    const v = composeSettleFormValues(
      fixture(),
      [
        account({
          id: 'bank-alice',
          name: 'Alice Chequing',
          type: 'chequing',
          owners: [defaultSettlementMembers.alice],
        }),
      ],
      '2026-01-05',
      'shared'
    );
    expect(v.sourceAccountId).toBe('bank-alice');
  });

  it('prefills zero for an unknown member id', () => {
    const v = composeSettleFormValues(
      fixture(),
      sourceAccounts,
      '2026-01-05',
      'unknown'
    );
    expect(v.amountDollars).toBe(0);
  });
});

describe('composeSettleAmountForPayToward', () => {
  it('matches compose amount prefill for member and shared pay-toward', () => {
    const accountRow = fixture();
    expect(composeSettleAmountForPayToward(accountRow, 'alice')).toBe(0);
    expect(composeSettleAmountForPayToward(accountRow, 'betty')).toBe(5);
    expect(composeSettleAmountForPayToward(accountRow, 'shared')).toBe(2);
    expect(composeSettleAmountForPayToward(accountRow, 'cas')).toBe(0);
  });
});
