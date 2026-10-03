import { describe, expect, it } from 'vitest';
import {
  createImportDraftResponseSchema,
  importHistoryPageSchema,
} from '../imports';
import { transactionListResponseSchema } from '../transactions';

const TIMESTAMP = '2026-06-01T12:00:00.000Z';

const assignee = (percentage: unknown) => ({
  transactionId: 'tx_1',
  memberId: 'm_1',
  amountCents: 1000,
  percentage,
  firstName: 'Ada',
  lastName: null,
  email: 'ada@example.com',
  imageUrl: null,
});

const transactionRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'tx_1',
  orgId: 'org_1',
  type: 'expense',
  amount: 3000,
  date: '2026-06-01',
  description: 'Groceries',
  categoryId: 'cat_1',
  categoryName: 'Groceries',
  categoryIcon: 'ShoppingCart',
  categoryColour: 'green-500',
  accountId: 'acct_1',
  accountName: 'Visa',
  accountType: 'credit_card',
  refundOf: null,
  incomeType: null,
  counterpartAccountId: null,
  counterpartAccountName: null,
  rawDescription: null,
  externalId: 'BANK-REF-1',
  notes: null,
  refundOfId: null,
  refundOfDate: null,
  refundOfAmountCents: null,
  importBatchId: null,
  recurringTemplateId: null,
  deletedAt: null,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  assignees: [assignee(33.333), assignee(null)],
  tags: [{ transactionId: 'tx_1', id: 'tag_1', name: 'Home', colour: null }],
  ...overrides,
});

const listPage = (row: Record<string, unknown>) => ({
  data: [row],
  total: 1,
  page: 1,
  limit: 25,
  amountSum: -3000,
});

describe('transactionListResponseSchema', () => {
  it('parses a page whose split percentages are numbers or null', () => {
    const parsed = transactionListResponseSchema.parse(
      listPage(transactionRow())
    );

    expect(parsed.data[0]?.assignees.map((a) => a.percentage)).toEqual([
      33.333,
      null,
    ]);
  });

  it.each([
    ['a string percentage', { assignees: [assignee('33.333')] }],
    ['a timestamp as the calendar date', { date: TIMESTAMP }],
    ['a Postgres-format timestamp', { createdAt: '2026-06-01 12:00:00+00' }],
    ['an unknown transaction type', { type: 'gift' }],
  ])('rejects a row with %s', (_label, overrides) => {
    expect(
      transactionListResponseSchema.safeParse(
        listPage(transactionRow(overrides))
      ).success
    ).toBe(false);
  });
});

const importTarget = {
  id: 'acct_1',
  name: 'Visa',
  institutionId: 'td',
  lastFour: '1234',
};

describe('createImportDraftResponseSchema', () => {
  it('parses an upload that needs a column mapping', () => {
    const body = {
      kind: 'mapping_required',
      candidateProfileIds: ['amex'],
      columns: ['Date', 'Amount'],
      sampleRows: [['2026-06-01', '12.00']],
    };

    expect(createImportDraftResponseSchema.parse(body)).toEqual(body);
  });
});

describe('importHistoryPageSchema', () => {
  const identity = {
    id: 'batch_1',
    account: importTarget,
    contentProfileId: null,
    fileName: null,
    rowCount: 3,
    importedAt: TIMESTAMP,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };

  it('parses completed and discarded items side by side', () => {
    const page = {
      data: [
        {
          ...identity,
          status: 'completed',
          completedAt: TIMESTAMP,
          discardedAt: null,
          createdCount: 2,
          matchedCount: 1,
          skippedCount: 0,
          invalidCount: 0,
        },
        {
          ...identity,
          status: 'discarded',
          completedAt: null,
          discardedAt: TIMESTAMP,
        },
      ],
      nextCursor: null,
    };

    expect(importHistoryPageSchema.parse(page)).toEqual(page);
  });

  it('rejects a completed item without its outcome counts', () => {
    expect(
      importHistoryPageSchema.safeParse({
        data: [
          {
            ...identity,
            status: 'completed',
            completedAt: TIMESTAMP,
            discardedAt: null,
          },
        ],
        nextCursor: null,
      }).success
    ).toBe(false);
  });
});
