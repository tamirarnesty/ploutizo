# Testing Patterns

**Analysis Date:** 2026-05-11

## Test Framework

**Runner:**
- Vitest 4.x
- Config: `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts`, `packages/db/vitest.config.ts`

**Assertion Library:**
- Vitest built-in (`expect`) — no separate assertion library

**Run Commands:**
```bash
pnpm test                          # Run all tests across all packages (turbo)
pnpm --filter api test             # Run API tests only
pnpm --filter web test             # Run web tests only
pnpm --filter @ploutizo/db test    # Run DB package tests only
pnpm --filter @ploutizo/validators test  # Run validators tests only
```

Note: All test commands use `vitest run` (single-pass, no watch). Watch mode is not configured in package scripts.

## Test File Organization

**Dominant pattern:** `__tests__/` subdirectory adjacent to `src/`
- API: `apps/api/src/__tests__/*.test.ts`
- DB package: `packages/db/src/__tests__/*.test.ts`
- Validators (deep tests): `packages/validators/src/__tests__/transactions.test.ts`

**Co-located exception:** `apps/web/src/lib/lrm.test.ts` — test alongside module when module is a pure utility

**Validators root-level tests:** `packages/validators/src/index.test.ts` — broad schema tests co-located at index

**Vitest `include` glob** (all configs): `src/**/*.test.ts` — picks up both patterns.

```
apps/api/src/
├── __tests__/
│   ├── accounts.test.ts
│   ├── categories.test.ts
│   ├── errors.test.ts
│   ├── health.test.ts
│   ├── households.test.ts
│   ├── merchant-rules.test.ts
│   ├── settlements.route.test.ts
│   ├── settlements.service.test.ts
│   ├── settlement-due-date.test.ts
│   ├── tags.test.ts
│   ├── tenantGuard.test.ts
│   ├── transactions.test.ts
│   ├── validator.test.ts
│   └── webhookAuth.test.ts
```

## Test Structure

**Suite Organization:**

```typescript
import { describe, expect, it, vi } from 'vitest'

// All module-level mocks declared before any describe blocks
vi.mock('@ploutizo/db', () => ({ ... }))
vi.mock('@clerk/hono', () => ({ ... }))

// Optional: shared fixture constants at module scope
const VALID_ACCOUNT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

// App/handler constructed once at module scope for route tests
const app = new Hono()
app.route('/', transactionsRouter)

describe('POST /api/transactions', () => {
  it('TXN-POST-01: creates expense with valid payload → 201', async () => {
    const res = await app.request('/', { method: 'POST', ... })
    expect(res.status).toBe(201)
    const body = await res.json() as { data: { id: string } }
    expect(body.data.id).toBe('txn_1')
  })
})
```

**Test name convention:** `DOMAIN-VERB-NN: human-readable description → expected outcome`
- Examples: `TXN-POST-01`, `GET-SETTLE-04`, `VAL-01`
- Traceable to design doc IDs (D-xx) and task IDs

**Patterns:**
- `beforeEach` used for mock resets in service tests — `vi.mocked(fn).mockReset()`
- `vi.mocked(fn).mockClear()` used in route tests before asserting call args
- `vi.mocked(fn).mockResolvedValueOnce(...)` for per-test overrides of default mocks
- `vi.hoisted()` used when a mock variable must be initialized before `vi.mock` factories run

## Mocking

**Framework:** Vitest `vi.mock()` — all mocks are module-level hoisted automatically

**Core mocking patterns:**

**1. Drizzle query builder chain mock (route tests):**
```typescript
vi.mock('@ploutizo/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([mockRow]),
            }),
          }),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockRow]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockRow]),
        }),
      }),
    }),
    transaction: vi.fn(async (fn) => fn({ insert: ..., delete: ..., update: ... })),
  },
}))
```

**2. Schema mock (route tests):** Tables are mocked as empty objects so Drizzle operators have something to reference:
```typescript
vi.mock('@ploutizo/db/schema', () => ({
  transactions: {},
  accounts: {},
  categories: {},
}))
```

**3. Clerk auth mock:**
```typescript
vi.mock('@clerk/hono', () => ({
  getAuth: vi.fn(() => ({ orgId: 'org_test123' })),
}))
```

**4. Service mock for route tests (routes are thin HTTP handlers):**
```typescript
vi.mock('../services/transactions', () => ({
  createTransaction: vi.fn().mockResolvedValue({ id: 'txn_1', ... }),
  listTransactions: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 }),
}))
```

**5. Query layer mock for service tests (service real code runs against mocked queries):**
```typescript
vi.mock('../lib/queries/settlements', () => ({
  fetchSettlementBalances: vi.fn(),
  fetchAccountForSettlement: vi.fn(),
}))
```

**What to mock:**
- `@ploutizo/db` — never make real DB calls in tests
- `@clerk/hono` — control `getAuth` return value per-test
- Service layer in route tests — routes are thin; test HTTP wiring only
- Query layer in service tests — test business logic without DB

**What NOT to mock:**
- The module under test — the real code must run
- Zod schemas — validator tests run real `safeParse` calls
- Pure utility functions — test them directly (e.g., `lrmSplit`, `validateSplitSum`)

## Test Environment

**All tests run in `node` environment** — no DOM/jsdom. Confirmed in all three vitest configs:
```typescript
test: { environment: 'node', include: ['src/**/*.test.ts'] }
```

Hono routes are tested using `app.request(path, init)` — Hono's built-in test helper that bypasses HTTP and exercises middleware/handlers directly.

## Fixtures and Factories

**Inline mock row constants:**
```typescript
export const mockTxRow = {
  id: 'txn_1',
  orgId: 'org_test123',
  type: 'expense' as const,
  amount: 5000,
  date: '2026-01-15',
  // ... all fields with null defaults
}
```
- Defined at module scope in the test file
- `export`-ed when other test files need the same shape (cross-file reuse)
- Uses `as const` on discriminated union fields for TypeScript narrowing

**Shared base payload pattern (validator tests):**
```typescript
const baseFields = {
  accountId: '550e8400-e29b-41d4-a716-446655440000',
  amount: 1000,
  date: '2024-01-15',
}

it('rejects amount=0', () => {
  expect(schema.safeParse({ ...baseFields, type: 'expense', amount: 0 }).success).toBe(false)
})
```

**Valid UUID constants:** Tests that use Zod UUID validation define named constants:
```typescript
const VALID_ACCOUNT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const VALID_MEMBER_ID_1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'
```
Note: Zod v4 requires proper version bits (`[1-8]` in position 15, `[89abAB]` in position 20).

**Location:** All fixtures are inline within test files. No shared `__fixtures__/` directory.

## Coverage

**Requirements:** None enforced — no `coverage` configuration in any vitest config.

**View Coverage:**
```bash
# No coverage script configured — run manually if needed
pnpm --filter api exec vitest run --coverage
```

## Test Types

**Unit Tests:**
- Pure utility functions: `lrmSplit`, `validateSplitSum`, `settlement-due-date` logic
- Zod schemas: `packages/validators/src/index.test.ts`, `packages/validators/src/__tests__/transactions.test.ts`
- Error classes: `apps/api/src/__tests__/errors.test.ts`
- Middleware: `apps/api/src/__tests__/tenantGuard.test.ts`, `apps/api/src/__tests__/webhookAuth.test.ts`
- DB client initialization: `packages/db/src/__tests__/client.test.ts`
- Seed functions: `packages/db/src/__tests__/seeds.test.ts`

**Integration Tests (route-level):**
- Hono route handlers with mocked service layer: `apps/api/src/__tests__/*.test.ts`
- Full middleware + route pipeline exercised via `app.request()`
- Tenant guard injected via inline middleware: `app.use('/*', async (c, next) => { c.set('orgId', '...'); await next() })`

**Service Tests:**
- Service logic runs real code against mocked query layer: `apps/api/src/__tests__/settlements.service.test.ts`
- Verifies business rules (zero-balance filtering, error throws, transaction construction)

**E2E Tests:** Not present.

## Common Patterns

**Async Testing:**
```typescript
it('creates resource → 201', async () => {
  const res = await app.request('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ... }),
  })
  expect(res.status).toBe(201)
  const body = await res.json() as { data: { id: string } }
  expect(body.data.id).toBe('txn_1')
})
```

**Error Testing:**
```typescript
it('throws NotFoundError when resource missing', async () => {
  vi.mocked(getTransaction).mockResolvedValueOnce(null)
  const res = await app.request('/txn_missing')
  expect(res.status).toBe(404)
  const body = await res.json() as { error: { code: string } }
  expect(body.error.code).toBe('NOT_FOUND')
})

// Service-level error assertions:
it('throws DomainError on archived account', async () => {
  vi.mocked(fetchAccount).mockResolvedValue({ archivedAt: new Date() })
  const err = await createSettlement('org_1', input).catch((e: unknown) => e)
  expect(err).toBeInstanceOf(DomainError)
  expect((err as DomainError).statusCode).toBe(400)
})
```

**Spy on call arguments:**
```typescript
it('passes sort param to service', async () => {
  vi.mocked(listTransactions).mockClear()
  await app.request('/?sort=type')
  const callArgs = vi.mocked(listTransactions).mock.calls[0][0]
  expect(callArgs.sort).toBe('type')
})
```

**Dynamic import for module-resetting tests:**
```typescript
beforeEach(() => {
  vi.resetModules()
  process.env.DATABASE_URL = 'postgresql://...'
})

it('initializes Pool with DATABASE_URL', async () => {
  const { Pool } = await import('@neondatabase/serverless') as { Pool: ReturnType<typeof vi.fn> }
  await import('../client.js')
  expect(Pool).toHaveBeenCalledWith(expect.objectContaining({ connectionString: '...' }))
})
```

---

*Testing analysis: 2026-05-11*
