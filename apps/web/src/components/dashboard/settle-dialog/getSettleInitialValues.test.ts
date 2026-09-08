import { describe, expect, it } from 'vitest';
import {
  getSettleAmountForPayToward,
  getSettleInitialValues,
} from '@/components/dashboard/settle-dialog/getSettleInitialValues';
import {
  defaultSettlementSourceAccounts,
  mockSettlementAccountRow,
} from '@/test/settlementFixtures';

const fixture = mockSettlementAccountRow;
const sourceAccounts = defaultSettlementSourceAccounts;

describe('getSettleInitialValues', () => {
  it('uses explicit member pay-toward and prefill from personal balance', () => {
    const v = getSettleInitialValues(
      fixture(),
      sourceAccounts,
      '2026-01-05',
      'alice'
    );
    expect(v.payToward).toBe('alice');
    expect(v.amountDollars).toBe(0);
    expect(v.sourceAccountId).toBe('bank-alice');
  });

  it('prefills positive personal balance for selected member', () => {
    const v = getSettleInitialValues(
      fixture(),
      sourceAccounts,
      '2026-01-05',
      'betty'
    );
    expect(v.payToward).toBe('betty');
    expect(v.amountDollars).toBe(5);
  });

  it('shared pay-toward prefill uses shared balance and joint paid-from default', () => {
    const v = getSettleInitialValues(
      fixture(),
      sourceAccounts,
      '2026-01-05',
      'shared'
    );
    expect(v.payToward).toBe('shared');
    expect(v.amountDollars).toBe(2);
    expect(v.sourceAccountId).toBe('bank-joint');
  });

  it('recomputes amount when pay-toward changes', () => {
    const account = fixture();
    expect(getSettleAmountForPayToward(account, 'alice')).toBe(0);
    expect(getSettleAmountForPayToward(account, 'betty')).toBe(5);
    expect(getSettleAmountForPayToward(account, 'shared')).toBe(2);
  });
});
