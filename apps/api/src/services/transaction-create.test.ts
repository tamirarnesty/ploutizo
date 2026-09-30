import { beforeEach, describe, expect, it } from 'vitest';
import type { CreateTransactionInput } from '@ploutizo/validators';
import type { TransactionCreate } from '@/services/transaction-create';
import {
  ACCOUNT,
  BATCH,
  CATEGORY,
  FUNDING,
  MEMBER,
  ORG,
  TAG,
  accountRef,
  failInsert,
  insertCalls,
  insertedRows,
  mockTx,
  resetTransactionWriteHarness,
  roundTrips,
  seedOrg,
} from '@/__tests__/transaction-write-harness';
import { DomainError, NotFoundError } from '@/lib/errors';
import { lockAccountWriteReferences } from '@/lib/queries/scope';
import {
  createTransaction,
  createTransactionsInTx,
} from '@/services/transaction-create';

const tx = mockTx as never;
const EXISTING_EXPENSE = '550e8400-e29b-41d4-a716-446655440060';
const OTHER_ACCOUNT = '550e8400-e29b-41d4-a716-446655440012';

const expense = (
  overrides: Partial<Extract<CreateTransactionInput, { type: 'expense' }>> = {}
): CreateTransactionInput => ({
  type: 'expense',
  accountId: ACCOUNT,
  amount: 1000,
  date: '2026-05-01',
  description: 'Coffee',
  categoryId: CATEGORY,
  assignees: [{ memberId: MEMBER, amountCents: 1000, percentage: 100 }],
  ...overrides,
});

const expenses = (count: number): TransactionCreate[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `tx-${String(index).padStart(4, '0')}`,
    input: expense({ importBatchId: BATCH, externalId: `ext-${index}` }),
  }));

const rejection = (promise: Promise<unknown>) =>
  promise.then(
    () => {
      throw new Error('expected rejection');
    },
    (error: unknown) => error
  );

describe('createTransactionsInTx', () => {
  beforeEach(() => {
    resetTransactionWriteHarness();
    seedOrg({
      accounts: [
        accountRef(ACCOUNT, 'credit_card'),
        accountRef(FUNDING, 'chequing'),
      ],
      categoryIds: [CATEGORY],
      tagIds: [TAG],
      memberIds: [MEMBER],
      transactionIds: [EXISTING_EXPENSE],
      importBatchIds: [BATCH],
    });
  });

  it('writes one transaction with its assignees and tags', async () => {
    const rows = await createTransactionsInTx(tx, ORG, [
      {
        id: 'tx-1',
        input: expense({ tagIds: [TAG], notes: 'weekly' }),
      },
    ]);

    expect(insertedRows('transactions')).toEqual([
      {
        id: 'tx-1',
        orgId: ORG,
        type: 'expense',
        accountId: ACCOUNT,
        amount: 1000,
        date: '2026-05-01',
        description: 'Coffee',
        categoryId: CATEGORY,
        notes: 'weekly',
      },
    ]);
    expect(insertedRows('transaction_assignees')).toEqual([
      {
        transactionId: 'tx-1',
        memberId: MEMBER,
        amountCents: 1000,
        percentage: '100',
      },
    ]);
    expect(insertedRows('transaction_tags')).toEqual([
      { transactionId: 'tx-1', tagId: TAG },
    ]);
    expect(rows.map((row) => row.id)).toEqual(['tx-1']);
  });

  it('issues the same round trips for one row and for many rows', async () => {
    const expected = {
      accountLocks: 1,
      categories: 1,
      tags: 0,
      members: 1,
      refundTargets: 0,
      importBatches: 1,
      inserts: ['transactions', 'transaction_assignees'],
    };

    await createTransactionsInTx(tx, ORG, expenses(1));
    expect(roundTrips()).toEqual(expected);

    resetTransactionWriteHarness();
    seedOrg({
      accounts: [accountRef(ACCOUNT, 'credit_card')],
      categoryIds: [CATEGORY],
      memberIds: [MEMBER],
      importBatchIds: [BATCH],
    });
    await createTransactionsInTx(tx, ORG, expenses(200));
    expect(roundTrips()).toEqual(expected);
  });

  it('returns rows in item order even though RETURNING order differs', async () => {
    const rows = await createTransactionsInTx(tx, ORG, expenses(3));

    expect(rows.map((row) => row.id)).toEqual([
      'tx-0000',
      'tx-0001',
      'tx-0002',
    ]);
  });

  it('points a same-batch refund at its expense id and inserts the expense first', async () => {
    const rows = await createTransactionsInTx(tx, ORG, [
      {
        id: 'refund-1',
        input: {
          type: 'refund',
          accountId: ACCOUNT,
          amount: 400,
          date: '2026-05-03',
          description: 'Coffee refund',
          categoryId: CATEGORY,
          refundOf: 'expense-1',
          assignees: [{ memberId: MEMBER, amountCents: 400, percentage: 100 }],
        },
      },
      { id: 'expense-1', input: expense() },
    ]);

    expect(
      insertedRows('transactions').map((row) => ({
        id: row.id,
        refundOf: row.refundOf,
      }))
    ).toEqual([
      { id: 'expense-1', refundOf: undefined },
      { id: 'refund-1', refundOf: 'expense-1' },
    ]);
    expect(roundTrips().refundTargets).toBe(0);
    expect(rows.map((row) => row.id)).toEqual(['refund-1', 'expense-1']);
  });

  it('accepts a refund of an existing org transaction', async () => {
    await createTransactionsInTx(tx, ORG, [
      {
        id: 'refund-1',
        input: {
          type: 'refund',
          accountId: ACCOUNT,
          amount: 400,
          date: '2026-05-03',
          description: 'Coffee refund',
          categoryId: CATEGORY,
          refundOf: EXISTING_EXPENSE,
          assignees: [{ memberId: MEMBER, amountCents: 400, percentage: 100 }],
        },
      },
    ]);

    expect(insertedRows('transactions')[0]).toMatchObject({
      id: 'refund-1',
      refundOf: EXISTING_EXPENSE,
    });
  });

  it('locks every distinct account and counterpart in one sorted statement', async () => {
    seedOrg({
      accounts: [
        accountRef(ACCOUNT, 'credit_card'),
        accountRef(FUNDING, 'chequing'),
        accountRef(OTHER_ACCOUNT, 'savings'),
      ],
      categoryIds: [CATEGORY],
      memberIds: [MEMBER],
    });
    const transfer = (
      id: string,
      accountId: string,
      counterpartAccountId: string
    ): TransactionCreate => ({
      id,
      input: {
        type: 'transfer',
        accountId,
        counterpartAccountId,
        amount: 1000,
        date: '2026-05-01',
        description: 'Transfer',
        assignees: [{ memberId: MEMBER, amountCents: 1000, percentage: 100 }],
      },
    });

    await createTransactionsInTx(tx, ORG, [
      transfer('t-1', OTHER_ACCOUNT, FUNDING),
      transfer('t-2', FUNDING, OTHER_ACCOUNT),
    ]);

    expect(lockAccountWriteReferences).toHaveBeenCalledOnce();
    expect(lockAccountWriteReferences).toHaveBeenCalledWith(tx, ORG, [
      FUNDING,
      OTHER_ACCOUNT,
    ]);
  });

  it('splits 2,500 rows into 1,000-row INSERT statements per table', async () => {
    await createTransactionsInTx(tx, ORG, expenses(2500));

    const sizes = (table: string) =>
      insertCalls
        .filter((call) => call.table === table)
        .map((call) => call.rows.length);
    expect(sizes('transactions')).toEqual([1000, 1000, 500]);
    expect(sizes('transaction_assignees')).toEqual([1000, 1000, 500]);
    expect(sizes('transaction_tags')).toEqual([]);
  });

  it('keeps a same-batch refund in or after its expense chunk', async () => {
    const items = expenses(1000);
    items.unshift({
      id: 'refund-last',
      input: {
        type: 'refund',
        accountId: ACCOUNT,
        amount: 400,
        date: '2026-05-03',
        description: 'Refund',
        categoryId: CATEGORY,
        refundOf: 'tx-0999',
        assignees: [{ memberId: MEMBER, amountCents: 400, percentage: 100 }],
      },
    });

    await createTransactionsInTx(tx, ORG, items);

    const chunks = insertCalls
      .filter((call) => call.table === 'transactions')
      .map((call) => call.rows.map((row) => row.id));
    expect(chunks[0].at(-1)).toBe('tx-0999');
    expect(chunks[1]).toEqual(['refund-last']);
  });

  it('writes nothing for an empty item list', async () => {
    expect(await createTransactionsInTx(tx, ORG, [])).toEqual([]);
    expect(roundTrips()).toEqual({
      accountLocks: 0,
      categories: 0,
      tags: 0,
      members: 0,
      refundTargets: 0,
      importBatches: 0,
      inserts: [],
    });
  });

  it.each([
    {
      name: 'counterpart not in org',
      input: {
        type: 'transfer',
        accountId: FUNDING,
        counterpartAccountId: OTHER_ACCOUNT,
        amount: 1000,
        date: '2026-05-01',
        description: 'Transfer',
        assignees: [{ memberId: MEMBER, amountCents: 1000, percentage: 100 }],
      } satisfies CreateTransactionInput,
      error: {
        statusCode: 400,
        code: 'INVALID_COUNTERPART_ACCOUNT',
        message: 'counterpartAccountId references an account not in this org',
      },
    },
    {
      name: 'refundOf not in org',
      input: {
        type: 'refund',
        accountId: ACCOUNT,
        amount: 400,
        date: '2026-05-03',
        description: 'Refund',
        categoryId: CATEGORY,
        refundOf: '550e8400-e29b-41d4-a716-446655440099',
        assignees: [{ memberId: MEMBER, amountCents: 400, percentage: 100 }],
      } satisfies CreateTransactionInput,
      error: {
        statusCode: 400,
        code: 'INVALID_REFUND_REFERENCE',
        message: 'refundOf transaction not found in this org',
      },
    },
    {
      name: 'import batch not in org',
      input: expense({ importBatchId: '550e8400-e29b-41d4-a716-446655440098' }),
      error: { statusCode: 404, message: 'Import batch not found.' },
    },
    {
      name: 'account not in org',
      input: expense({ accountId: OTHER_ACCOUNT }),
      error: { statusCode: 404, message: 'Account not found' },
    },
    {
      name: 'category not in org',
      input: expense({ categoryId: '550e8400-e29b-41d4-a716-446655440097' }),
      error: { statusCode: 404, message: 'Category not found' },
    },
    {
      name: 'tag not in org',
      input: expense({ tagIds: [TAG, '550e8400-e29b-41d4-a716-446655440096'] }),
      error: { statusCode: 404, message: 'Tag not found' },
    },
    {
      name: 'assignee not in org',
      input: expense({
        assignees: [
          {
            memberId: '550e8400-e29b-41d4-a716-446655440095',
            amountCents: 1000,
            percentage: 100,
          },
        ],
      }),
      error: { statusCode: 404, message: 'Member not found in this household' },
    },
    {
      name: 'account policy violation',
      input: {
        type: 'income',
        accountId: ACCOUNT,
        amount: 1000,
        date: '2026-05-01',
        description: 'Paycheck',
        incomeType: 'direct_deposit',
        assignees: [{ memberId: MEMBER, amountCents: 1000, percentage: 100 }],
      } satisfies CreateTransactionInput,
      error: { statusCode: 400, code: 'TRANSACTION_ACCOUNT_POLICY_VIOLATION' },
    },
  ])('rejects the whole batch when one item has a $name', async (testCase) => {
    const err = await rejection(
      createTransactionsInTx(tx, ORG, [
        { id: 'ok', input: expense() },
        { id: 'bad', input: testCase.input },
      ])
    );

    expect(err).toBeInstanceOf(
      testCase.error.statusCode === 404 ? NotFoundError : DomainError
    );
    expect(err).toMatchObject(testCase.error);
    expect(insertCalls).toEqual([]);
  });

  it('rejects a split-sum mismatch before any query', async () => {
    const err = await rejection(
      createTransactionsInTx(tx, ORG, [
        {
          id: 'bad',
          input: expense({
            assignees: [
              { memberId: MEMBER, amountCents: 999, percentage: 100 },
            ],
          }),
        },
      ])
    );

    expect(err).toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Assignee amounts must sum to transaction amount',
    });
    expect(lockAccountWriteReferences).not.toHaveBeenCalled();
  });

  it('requires a counterpart for settlements and contributions', async () => {
    const withoutCounterpart = (type: 'settlement' | 'contribution') =>
      rejection(
        createTransactionsInTx(tx, ORG, [
          {
            id: type,
            input: {
              type,
              accountId: type === 'settlement' ? ACCOUNT : FUNDING,
              amount: 1000,
              date: '2026-05-01',
              description: 'Payment',
              assignees: [
                { memberId: MEMBER, amountCents: 1000, percentage: 100 },
              ],
            } as unknown as CreateTransactionInput,
          },
        ])
      );

    for (const type of ['settlement', 'contribution'] as const) {
      const err = await withoutCounterpart(type);
      expect(err).toMatchObject({
        statusCode: 400,
        code: 'TRANSACTION_ACCOUNT_POLICY_VIOLATION',
      });
      expect((err as DomainError).message).toContain('counterpartAccountId');
    }
  });

  describe('archived accounts', () => {
    beforeEach(() => {
      seedOrg({
        accounts: [
          accountRef(ACCOUNT, 'chequing', new Date('2026-01-15T18:00:00.000Z')),
          accountRef(FUNDING, 'savings', new Date('2026-01-01T00:00:00.000Z')),
        ],
        categoryIds: [CATEGORY],
        memberIds: [MEMBER],
      });
    });

    it('allows a write dated on the archive calendar date', async () => {
      const rows = await createTransactionsInTx(tx, ORG, [
        { id: 'on-date', input: expense({ date: '2026-01-15' }) },
      ]);

      expect(rows.map((row) => row.id)).toEqual(['on-date']);
    });

    it('rejects a write dated after the archive date', async () => {
      const err = await rejection(
        createTransactionsInTx(tx, ORG, [
          { id: 'late', input: expense({ date: '2026-01-16' }) },
        ])
      );

      expect(err).toMatchObject({
        statusCode: 400,
        code: 'ARCHIVED_ACCOUNT_DATE',
      });
      expect(insertCalls).toEqual([]);
    });

    it('rejects when only the counterpart is archived before the date', async () => {
      const err = await rejection(
        createTransactionsInTx(tx, ORG, [
          {
            id: 'transfer',
            input: {
              type: 'transfer',
              accountId: ACCOUNT,
              counterpartAccountId: FUNDING,
              amount: 1000,
              date: '2026-01-02',
              description: 'Transfer',
              assignees: [
                { memberId: MEMBER, amountCents: 1000, percentage: 100 },
              ],
            },
          },
        ])
      );

      expect(err).toMatchObject({ code: 'ARCHIVED_ACCOUNT_DATE' });
      expect((err as DomainError).message).toContain('counterpart account');
    });
  });

  it('maps the active external-id unique violation to 409', async () => {
    failInsert('transactions', {
      code: '23505',
      constraint: 'transactions_active_account_external_id_idx',
    });

    const err = await rejection(createTransactionsInTx(tx, ORG, expenses(2)));

    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({
      statusCode: 409,
      code: 'EXTERNAL_ID_CONFLICT',
    });
  });

  it('does not map unrelated unique violations', async () => {
    failInsert('transaction_assignees', {
      code: '23505',
      constraint: 'transaction_assignees_tx_member_idx',
    });

    const err = await rejection(createTransactionsInTx(tx, ORG, expenses(1)));

    expect(err).not.toBeInstanceOf(DomainError);
    expect(err).toEqual({
      code: '23505',
      constraint: 'transaction_assignees_tx_member_idx',
    });
  });
});

describe('createTransaction', () => {
  beforeEach(() => {
    resetTransactionWriteHarness();
    seedOrg({
      accounts: [accountRef(ACCOUNT, 'credit_card')],
      categoryIds: [CATEGORY],
      memberIds: [MEMBER],
    });
  });

  it('creates one transaction under a generated id and returns its row', async () => {
    const row = await createTransaction(ORG, expense());

    const [inserted] = insertedRows('transactions');
    expect(inserted.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(row).toEqual(inserted);
    expect(insertedRows('transaction_assignees')).toEqual([
      {
        transactionId: inserted.id,
        memberId: MEMBER,
        amountCents: 1000,
        percentage: '100',
      },
    ]);
  });
});
