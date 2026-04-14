import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { transactionsRouter } from '../routes/transactions';
import {
  checkRefundOfOwnership,
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  restoreTransaction,
  updateTransaction,
  validateSplitSum,
} from '../services/transactions';
import type { ListQueryParams } from '../services/transactions';

// Re-import mocked service functions so per-test overrides work

// Mock transaction row — exported so Wave 1/Wave 2 plans can import when filling in stubs
export const mockTxRow = {
  id: 'txn_1',
  orgId: 'org_test123',
  type: 'expense' as const,
  amount: 5000,
  date: '2026-01-15',
  accountId: 'acct_1',
  accountName: 'Chequing',
  accountType: 'chequing',
  description: null,
  merchant: null,
  categoryId: null,
  categoryName: null,
  categoryIcon: null,
  refundOf: null,
  incomeType: null,
  incomeSource: null,
  toAccountId: null,
  settledAccountId: null,
  investmentType: null,
  importBatchId: null,
  recurringTemplateId: null,
  deletedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Mock @hono/clerk-auth so getAuth returns a known orgId — identical to accounts.test.ts
vi.mock('@hono/clerk-auth', () => ({
  getAuth: vi.fn(() => ({ orgId: 'org_test123' })),
}));

// Mock @ploutizo/db — extends accounts.test.ts pattern to cover:
//   - base list query: select → from → leftJoin (×2) → where → orderBy → limit → offset
//   - sub-queries: select → from → innerJoin → where (resolves immediately)
//   - db.transaction with multi-table writes (insert, delete, update)
vi.mock('@ploutizo/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([mockTxRow]),
            }),
          }),
          limit: vi.fn().mockResolvedValue([mockTxRow]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockTxRow]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockTxRow]),
        }),
      }),
    }),
    transaction: vi.fn(
      async (
        fn: (tx: {
          insert: ReturnType<typeof vi.fn>;
          delete: ReturnType<typeof vi.fn>;
          update: ReturnType<typeof vi.fn>;
        }) => Promise<unknown>
      ) => {
        const result = await fn({
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockTxRow]),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([mockTxRow]),
              }),
            }),
          }),
        });
        return result;
      }
    ),
  },
}));

// Mock schema — all tables needed by the joined GET and write routes
vi.mock('@ploutizo/db/schema', () => ({
  transactions: {},
  transactionAssignees: {},
  transactionTags: {},
  categories: {},
  accounts: {},
  tags: {},
  orgMembers: {},
}));

// Mock the service layer — routes are thin HTTP handlers; all business logic tested via services
vi.mock('../services/transactions', () => ({
  createTransaction: vi.fn().mockResolvedValue({
    id: 'txn_1',
    orgId: 'org_test123',
    type: 'expense',
    amount: 5000,
    date: '2026-01-15',
    accountId: 'acct_1',
    description: null,
    merchant: null,
    categoryId: null,
    refundOf: null,
    incomeType: null,
    incomeSource: null,
    toAccountId: null,
    settledAccountId: null,
    investmentType: null,
    importBatchId: null,
    recurringTemplateId: null,
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  validateSplitSum: vi.fn().mockReturnValue(null), // default: valid
  checkRefundOfOwnership: vi.fn().mockResolvedValue(true),
  listTransactions: vi.fn().mockResolvedValue({
    data: [],
    total: 0,
    page: 1,
    limit: 50,
  }),
  getTransaction: vi.fn().mockResolvedValue({
    id: 'txn_1',
    orgId: 'org_test123',
    type: 'expense',
    amount: 5000,
    date: '2026-01-15',
    accountId: 'acct_1',
    accountName: 'Chequing',
    accountType: 'chequing',
    description: null,
    merchant: null,
    categoryId: null,
    categoryName: null,
    categoryIcon: null,
    refundOf: null,
    incomeType: null,
    incomeSource: null,
    toAccountId: null,
    settledAccountId: null,
    investmentType: null,
    importBatchId: null,
    recurringTemplateId: null,
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignees: [],
    tags: [],
  }),
  updateTransaction: vi.fn().mockResolvedValue({
    id: 'txn_1',
    orgId: 'org_test123',
    type: 'expense',
    amount: 5000,
    date: '2026-01-15',
    accountId: 'acct_1',
    description: 'Updated',
    merchant: null,
    categoryId: null,
    refundOf: null,
    incomeType: null,
    incomeSource: null,
    toAccountId: null,
    settledAccountId: null,
    investmentType: null,
    importBatchId: null,
    recurringTemplateId: null,
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  deleteTransaction: vi.fn().mockResolvedValue({ id: 'txn_1' }),
  restoreTransaction: vi.fn().mockResolvedValue({ id: 'txn_1' }),
}));

const app = new Hono();
app.route('/', transactionsRouter);

// Valid UUIDs for test payloads — Zod v4 requires proper version bits ([1-8] in position 15, [89abAB] in position 20)
const VALID_ACCOUNT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_MEMBER_ID_1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
const VALID_MEMBER_ID_2 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';

describe('POST /api/transactions', () => {
  it('TXN-POST-01: creates expense with valid payload → 201', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'expense',
        accountId: VALID_ACCOUNT_ID,
        amount: 5000,
        date: '2026-01-15',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe('txn_1');
    expect(body.data.orgId).toBe('org_test123');
  });

  it('TXN-POST-02: income without incomeType → 400 VALIDATION_ERROR', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'income',
        accountId: VALID_ACCOUNT_ID,
        amount: 5000,
        date: '2026-01-15',
        // incomeType intentionally omitted
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('TXN-POST-03: transfer without toAccountId → 400 VALIDATION_ERROR', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'transfer',
        accountId: VALID_ACCOUNT_ID,
        amount: 5000,
        date: '2026-01-15',
        // toAccountId intentionally omitted
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('TXN-POST-04: assignees sum mismatch → 400 BAD_REQUEST', async () => {
    vi.mocked(validateSplitSum).mockReturnValueOnce(
      'Assignee amounts must sum to transaction amount'
    );
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'expense',
        accountId: VALID_ACCOUNT_ID,
        amount: 5000,
        date: '2026-01-15',
        assignees: [
          { memberId: VALID_MEMBER_ID_1, amountCents: 3000 },
          { memberId: VALID_MEMBER_ID_2, amountCents: 3000 },
        ],
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).toBe(
      'Assignee amounts must sum to transaction amount'
    );
  });

  it('TXN-POST-05: assignees omitted → 201, no assignee insert', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'expense',
        accountId: VALID_ACCOUNT_ID,
        amount: 5000,
        date: '2026-01-15',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBeDefined();
  });
});

describe('GET /api/transactions', () => {
  it('TXN-GET-01: GET / returns {data, total, page, limit} envelope', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe('number');
    expect(typeof body.page).toBe('number');
    expect(typeof body.limit).toBe('number');
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(50);
  });

  it('TXN-LIST-SORT-01: GET /?sort=type — passes sort=type to listTransactions', async () => {
    vi.mocked(listTransactions).mockClear();
    const res = await app.request('/?sort=type');
    expect(res.status).toBe(200);
    const callArgs = vi.mocked(listTransactions).mock.calls[0]?.[0];
    expect(callArgs?.sort).toBe('type');
  });

  it('TXN-LIST-SORT-02: GET /?sort=category — passes sort=category to listTransactions', async () => {
    vi.mocked(listTransactions).mockClear();
    const res = await app.request('/?sort=category');
    expect(res.status).toBe(200);
    const callArgs = vi.mocked(listTransactions).mock.calls[0]?.[0];
    expect(callArgs?.sort).toBe('category');
  });

  it('TXN-LIST-SORT-03: GET /?sort=account — passes sort=account to listTransactions', async () => {
    vi.mocked(listTransactions).mockClear();
    const res = await app.request('/?sort=account');
    expect(res.status).toBe(200);
    const callArgs = vi.mocked(listTransactions).mock.calls[0]?.[0];
    expect(callArgs?.sort).toBe('account');
  });
});

describe('GET /api/transactions/:id', () => {
  it('TXN-GET-02: GET /:id returns joined shape with assignees[] and tags[]', async () => {
    const res = await app.request('/txn_1');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data.assignees)).toBe(true);
    expect(Array.isArray(body.data.tags)).toBe(true);
  });

  it('TXN-GET-03: GET /:id on soft-deleted transaction → 404', async () => {
    vi.mocked(getTransaction).mockResolvedValueOnce(null);
    const res = await app.request('/txn_missing');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

describe('PATCH /api/transactions/:id', () => {
  it('TXN-PATCH-01: updates fields; assignees replace-all', async () => {
    const res = await app.request('/txn_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Updated' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { description: string } };
    expect(body.data.description).toBe('Updated');
  });

  it('TXN-PATCH-02: wrong orgId → 404', async () => {
    vi.mocked(updateTransaction).mockResolvedValueOnce(null);
    const res = await app.request('/txn_missing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'X' }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

describe('DELETE /api/transactions/:id', () => {
  it('TXN-DELETE-01: sets deletedAt → 200 {data: {id}}', async () => {
    const res = await app.request('/txn_1', { method: 'DELETE' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string } };
    expect(body.data.id).toBe('txn_1');
  });

  it('TXN-DELETE-02: already-deleted → 404', async () => {
    vi.mocked(deleteTransaction).mockResolvedValueOnce(null);
    const res = await app.request('/txn_1', { method: 'DELETE' });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

describe('PATCH /:id/restore', () => {
  it('TXN-RESTORE-01: PATCH /:id/restore — 200 with matching orgId', async () => {
    const res = await app.request('/txn_1/restore', { method: 'PATCH' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string } };
    expect(body.data.id).toBe('txn_1');
  });

  it('TXN-RESTORE-02: PATCH /:id/restore — 404 when not found (wrong org or already active)', async () => {
    vi.mocked(restoreTransaction).mockResolvedValueOnce(null);
    const res = await app.request('/txn_1/restore', { method: 'PATCH' });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
