import type {
  Account,
  SettlementAccountRow,
  SettlementStatus,
} from '@ploutizo/types';
import type { TransactionRow } from '@/lib/data-access/transactions';

export const mockSettlementAccount = (): SettlementAccountRow => ({
  account: {
    id: 'acct-1',
    name: 'Platinum',
    type: 'credit_card',
    institution: 'Coast',
    lastFour: '4242',
    statementDueDay: 15,
    owners: [{ id: 'mAda', displayName: 'Ada', imageUrl: null }],
  },
  totalBalanceCents: 5000,
  sharedBalanceCents: 0,
  sharedParticipantIds: [],
  members: [
    {
      member: { id: 'mAda', name: 'Ada', avatarUrl: null },
      personalBalanceCents: 5000,
    },
  ],
  dueDate: '2026-05-31',
  status: 'on_track' as SettlementStatus,
});

export const mockAccount = (): Account => ({
  id: 'acct-checking',
  orgId: 'org-1',
  name: 'Chequing',
  type: 'chequing',
  institution: 'Coast',
  lastFour: '1234',
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  owners: [],
});

export const mockTransactionRow = (): TransactionRow => ({
  id: 'tx-1',
  orgId: 'org-1',
  type: 'expense',
  amount: -5,
  date: '2026-06-01',
  description: 'Coffee',
  categoryId: null,
  categoryName: null,
  categoryIcon: null,
  categoryColour: null,
  accountId: 'acct-1',
  accountName: 'Chequing',
  accountType: 'checking',
  refundOf: null,
  incomeType: null,
  counterpartAccountId: null,
  counterpartAccountName: null,
  rawDescription: null,
  notes: null,
  refundOfId: null,
  refundOfDate: null,
  refundOfAmountCents: null,
  importBatchId: null,
  recurringTemplateId: null,
  deletedAt: null,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  assignees: [],
  tags: [],
});
