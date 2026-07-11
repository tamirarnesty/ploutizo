import { describe, expect, it } from 'vitest';
import {
  formatContributionDescription,
  formatGeneratedTransactionDescription,
  formatGeneratedTransactionDescriptionFromAccounts,
  formatLinkedRefundDescription,
  formatSettlementDescription,
  formatTransferDescription,
} from './descriptions';

describe('formatSettlementDescription', () => {
  it('includes paid-from and card when source account is set', () => {
    expect(
      formatSettlementDescription('TD Visa', 'Tamir WS')
    ).toBe('Settlement from Tamir WS to TD Visa');
  });

  it('falls back to card-only when paid-from is absent', () => {
    expect(formatSettlementDescription('TD Visa')).toBe('Settlement: TD Visa');
    expect(formatSettlementDescription('TD Visa', null)).toBe(
      'Settlement: TD Visa'
    );
  });
});

describe('formatTransferDescription', () => {
  it('formats transfer copy from source and destination names', () => {
    expect(formatTransferDescription('Chequing', 'Savings')).toBe(
      'Transfer from Chequing to Savings'
    );
  });
});

describe('formatContributionDescription', () => {
  it('formats contribution copy from source and destination names', () => {
    expect(formatContributionDescription('Chequing', 'FHSA')).toBe(
      'Contribution from Chequing to FHSA'
    );
  });
});

describe('formatLinkedRefundDescription', () => {
  it('prefixes the original transaction description', () => {
    expect(formatLinkedRefundDescription('Coffee')).toBe('Refund of Coffee');
  });
});

describe('formatGeneratedTransactionDescription', () => {
  it('builds settlement descriptions from account names', () => {
    expect(
      formatGeneratedTransactionDescription({
        type: 'settlement',
        accountName: 'Amex Cobalt',
        counterpartAccountName: 'Emily WS',
      })
    ).toBe('Settlement from Emily WS to Amex Cobalt');
  });

  it('returns empty refund text when no linked transaction is selected', () => {
    expect(
      formatGeneratedTransactionDescription({
        type: 'refund',
        accountName: 'Chequing',
        refundOf: '',
      })
    ).toBe('');
  });
});

describe('formatGeneratedTransactionDescriptionFromAccounts', () => {
  it('resolves account names from the provided account list', () => {
    expect(
      formatGeneratedTransactionDescriptionFromAccounts(
        {
          type: 'transfer',
          accountId: 'source-1',
          counterpartAccountId: 'dest-1',
        },
        [
          { id: 'source-1', name: 'Chequing' },
          { id: 'dest-1', name: 'Savings' },
        ]
      )
    ).toBe('Transfer from Chequing to Savings');
  });
});
