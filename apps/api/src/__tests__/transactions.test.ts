import { describe, it, vi } from 'vitest'
import { Hono } from 'hono'
// Wave 1: uncomment when file exists
// import { transactionsRouter } from '../routes/transactions'

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
}

// Mock @hono/clerk-auth so getAuth returns a known orgId — identical to accounts.test.ts
vi.mock('@hono/clerk-auth', () => ({
  getAuth: vi.fn(() => ({ orgId: 'org_test123' })),
}))

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
    transaction: vi.fn(async (fn: (tx: {
      insert: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    }) => Promise<unknown>) => {
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
      })
      return result
    }),
  },
}))

// Mock schema — all tables needed by the joined GET and write routes
vi.mock('@ploutizo/db/schema', () => ({
  transactions: {},
  transactionAssignees: {},
  transactionTags: {},
  categories: {},
  accounts: {},
  tags: {},
  orgMembers: {},
}))

const app = new Hono()
// Wave 1: app.route('/', transactionsRouter)

describe('POST /api/transactions', () => {
  it.todo('TXN-POST-01: creates expense with valid payload → 201')
  it.todo('TXN-POST-02: income without incomeType → 400 VALIDATION_ERROR')
  it.todo('TXN-POST-03: transfer without toAccountId → 400 VALIDATION_ERROR')
  it.todo('TXN-POST-04: assignees sum mismatch → 400 BAD_REQUEST')
  it.todo('TXN-POST-05: assignees omitted → 201, no assignee insert')
})

describe('GET /api/transactions', () => {
  it.todo('TXN-GET-01: GET / returns {data, total, page, limit} envelope')
})

describe('GET /api/transactions/:id', () => {
  it.todo('TXN-GET-02: GET /:id returns joined shape with assignees[] and tags[]')
  it.todo('TXN-GET-03: GET /:id on soft-deleted transaction → 404')
})

describe('PATCH /api/transactions/:id', () => {
  it.todo('TXN-PATCH-01: PATCH updates fields; assignees replace-all (delete+insert)')
  it.todo('TXN-PATCH-02: PATCH wrong orgId → 404')
})

describe('DELETE /api/transactions/:id', () => {
  it.todo('TXN-DELETE-01: DELETE /:id sets deletedAt → 200 {data: {id}}')
  it.todo('TXN-DELETE-02: DELETE already-deleted → 404')
})
