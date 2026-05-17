import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { settlementsRouter } from '../routes/settlements';
import {
  createSettlement,
  getSettlementBalances,
} from '../services/settlements';
import type { AppEnv } from '../types';

vi.mock('@clerk/hono', () => ({
  getAuth: vi.fn(() => ({ orgId: 'org_test123' })),
}));

// Module-level service mock — Vitest hoists this so the imported router
// resolves the mocked service. Service unit tests live in a SEPARATE file
// (settlements.service.test.ts) so this hoist does not pollute them.
vi.mock('../services/settlements', () => ({
  getSettlementBalances: vi.fn().mockResolvedValue({ accounts: [] }),
  createSettlement: vi.fn(),
}));

const app = new Hono<AppEnv>();
// Mount with orgId pre-set via inline middleware to mimic tenantGuard behavior in tests
app.use('/*', async (c, next) => {
  c.set('orgId', 'org_test123');
  await next();
});
app.route('/', settlementsRouter);

describe('GET /api/settlements route', () => {
  beforeEach(() => {
    vi.mocked(getSettlementBalances).mockResolvedValue({ accounts: [] });
  });

  it('GET-SETTLE-01: GET / returns 200 with accounts array shape', async () => {
    const mockAccount = {
      account: {
        id: 'acct_1',
        name: 'Amex Gold',
        type: 'credit_card' as const,
        institution: 'American Express',
        lastFour: '1234',
        statementDueDay: 15,
        owners: [
          {
            id: 'mem_1',
            displayName: 'Alice',
            imageUrl: null,
          },
        ],
      },
      totalBalanceCents: 5000,
      members: [
        {
          member: { id: 'mem_1', name: 'Alice', avatarUrl: null },
          balanceCents: 5000,
        },
      ],
      dueDate: '2026-05-15',
      status: 'due_soon' as const,
    };
    vi.mocked(getSettlementBalances).mockResolvedValueOnce({
      accounts: [mockAccount],
    });

    const res = await app.request('/');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { accounts: (typeof mockAccount)[] };
    expect(body).toHaveProperty('accounts');
    expect(Array.isArray(body.accounts)).toBe(true);
    expect(body.accounts).toHaveLength(1);
    expect(body.accounts[0]).toHaveProperty('account');
    expect(body.accounts[0]).toHaveProperty('totalBalanceCents');
    expect(body.accounts[0]).toHaveProperty('members');
    expect(body.accounts[0]).toHaveProperty('dueDate');
    expect(body.accounts[0]).toHaveProperty('status');
  });

  it('GET-SETTLE-02: service receives the orgId from c.get("orgId")', async () => {
    await app.request('/');
    expect(getSettlementBalances).toHaveBeenCalledWith('org_test123');
  });

  it('GET-SETTLE-03: empty accounts array returned as { accounts: [] } — never undefined', async () => {
    vi.mocked(getSettlementBalances).mockResolvedValueOnce({ accounts: [] });

    const res = await app.request('/');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { accounts: unknown[] };
    expect(body).toHaveProperty('accounts');
    expect(Array.isArray(body.accounts)).toBe(true);
    expect(body.accounts).toHaveLength(0);
  });
});

describe('POST /api/settlements route', () => {
  const validPayload = {
    payerMemberId: '550e8400-e29b-41d4-a716-446655440001',
    accountId: '550e8400-e29b-41d4-a716-446655440002',
    amountCents: 5000,
    date: '2026-05-08',
  };

  const mockCreatedRow = {
    id: '550e8400-e29b-41d4-a716-446655440099',
    orgId: 'org_test123',
    type: 'settlement',
    accountId: '550e8400-e29b-41d4-a716-446655440002',
    amount: 5000,
    date: '2026-05-08',
    description: 'Settlement: Amex Gold',
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.mocked(createSettlement).mockReset();
    vi.mocked(createSettlement).mockResolvedValue(mockCreatedRow as never);
  });

  it('POST-SETTLE-01: valid payload => 201 with data wrapper containing created row', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });
    expect(res.status).toBe(201);

    const body = (await res.json()) as { data: typeof mockCreatedRow };

    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('id');
    expect(createSettlement).toHaveBeenCalledWith('org_test123', validPayload);
  });

  it('POST-SETTLE-02: missing accountId => 400 VALIDATION_ERROR', async () => {
    const { accountId: _omit, ...payload } = validPayload;
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(400);

    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST-SETTLE-03: amountCents: 0 => 400 (Zod .positive() rejects zero)', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, amountCents: 0 }),
    });
    expect(res.status).toBe(400);

    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST-SETTLE-04: amountCents: -100 => 400 (negative cents rejected)', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, amountCents: -100 }),
    });
    expect(res.status).toBe(400);

    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST-SETTLE-05: date not in ISO format => 400', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, date: 'May 8 2026' }),
    });
    expect(res.status).toBe(400);

    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
