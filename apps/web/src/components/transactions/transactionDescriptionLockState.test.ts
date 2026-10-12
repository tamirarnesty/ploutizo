import { describe, expect, it } from 'vitest';
import type { Account } from '@ploutizo/validators';
import { mockTransactionRow } from '@/test/overlayFixtures';
import {
  descriptionLockGenerationKey,
  getEditManualUnlockedGenerationKey,
  shouldUseGeneratedTransactionDescription,
} from './transactionDescriptionLockState';

const accounts: Account[] = [
  {
    id: 'acct-a',
    orgId: 'org-1',
    name: 'Chequing',
    type: 'chequing',
    institutionId: null,
    lastFour: null,
    statementDueDay: null,
    archivedAt: null,
    createdAt: '',
    updatedAt: '',
    owners: [],
  },
];

const baseTx = {
  ...mockTransactionRow(),
  type: 'transfer' as const,
  accountId: 'acct-a',
  counterpartAccountId: 'acct-b',
  description: 'Custom label',
  accountName: 'Chequing',
  counterpartAccountName: 'Savings',
};

describe('transactionDescriptionLockState', () => {
  it('marks generated-policy types as should lock', () => {
    expect(shouldUseGeneratedTransactionDescription('transfer', '')).toBe(true);
    expect(shouldUseGeneratedTransactionDescription('expense', '')).toBe(false);
  });

  it('returns a generation key when edit description is manually unlocked', () => {
    expect(getEditManualUnlockedGenerationKey(baseTx, accounts)).toBe(
      descriptionLockGenerationKey('transfer', '')
    );
  });
});
