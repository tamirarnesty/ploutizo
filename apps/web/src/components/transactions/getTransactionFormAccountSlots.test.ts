import { describe, expect, it } from 'vitest';
import { getTransactionFormAccountSlots } from './getTransactionFormAccountSlots';

describe('getTransactionFormAccountSlots', () => {
  it('renders a single Account slot for expense, refund, and income', () => {
    for (const type of ['expense', 'refund', 'income'] as const) {
      expect(getTransactionFormAccountSlots(type)).toEqual([
        expect.objectContaining({
          field: 'accountId',
          required: true,
          label: 'Account',
        }),
      ]);
    }
  });

  it('orders transfer and contribution as Source then Destination', () => {
    expect(
      getTransactionFormAccountSlots('transfer').map((slot) => [
        slot.field,
        slot.label,
      ])
    ).toEqual([
      ['accountId', 'Source'],
      ['counterpartAccountId', 'Destination'],
    ]);
    expect(
      getTransactionFormAccountSlots('contribution').map((slot) => [
        slot.field,
        slot.label,
      ])
    ).toEqual([
      ['accountId', 'Source'],
      ['counterpartAccountId', 'Destination'],
    ]);
  });

  it('shows settlement funding as Source even though it is the counterpart slot', () => {
    expect(
      getTransactionFormAccountSlots('settlement').map((slot) => [
        slot.field,
        slot.label,
      ])
    ).toEqual([
      ['counterpartAccountId', 'Source'],
      ['accountId', 'Destination'],
    ]);
  });

  it('derives create-account type from the first allowed type for each role', () => {
    expect(
      getTransactionFormAccountSlots('expense')[0]?.createAccountType
    ).toBe('credit_card');
    expect(getTransactionFormAccountSlots('income')[0]?.createAccountType).toBe(
      'chequing'
    );
    expect(
      getTransactionFormAccountSlots('settlement').map((slot) => [
        slot.label,
        slot.createAccountType,
      ])
    ).toEqual([
      ['Source', 'chequing'],
      ['Destination', 'credit_card'],
    ]);
    expect(
      getTransactionFormAccountSlots('contribution').map((slot) => [
        slot.label,
        slot.createAccountType,
      ])
    ).toEqual([
      ['Source', 'chequing'],
      ['Destination', 'investment'],
    ]);
  });
});
