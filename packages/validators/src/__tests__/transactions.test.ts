import { describe, expect, it } from 'vitest';
import {
  createTransactionSchema,
  patchTransactionSchema,
  updateTransactionSchema,
} from '../transactions';

const memberId = '550e8400-e29b-41d4-a716-446655440003';

const assignee = (amountCents = 1000, percentage = 100) => ({
  memberId,
  amountCents,
  percentage,
});

const categoryId = '550e8400-e29b-41d4-a716-446655440099';
const baseFields = {
  accountId: '550e8400-e29b-41d4-a716-446655440000',
  amount: 1000,
  date: '2024-01-15',
  description: 'Test transaction',
  categoryId,
  assignees: [assignee()],
};

const validExpense = { ...baseFields, type: 'expense' as const };

describe('createTransactionSchema — common field constraints', () => {
  it.each([
    ['zero amount', { amount: 0 }],
    ['negative amount', { amount: -100 }],
    ['fractional amount', { amount: 1.5 }],
    ['ISO datetime as date', { date: '2024-01-01T00:00:00Z' }],
    ['US-format date', { date: '01/15/2024' }],
    ['unknown transaction type', { type: 'unknown_type' }],
  ] as const)('rejects %s', (_label, override) => {
    expect(
      createTransactionSchema.safeParse({ ...validExpense, ...override })
        .success
    ).toBe(false);
  });
});

describe('VAL-01 — baseTransactionSchema field changes', () => {
  it('rejects expense without assignees', () => {
    const { assignees: _omit, ...withoutAssignees } = baseFields;
    const result = createTransactionSchema.safeParse({
      ...withoutAssignees,
      type: 'expense',
    });
    expect(result.success).toBe(false);
  });

  it('rejects assignee row without percentage', () => {
    const result = createTransactionSchema.safeParse({
      ...baseFields,
      type: 'expense',
      assignees: [{ memberId, amountCents: baseFields.amount }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts payload without notes (notes is optional)', () => {
    const result = createTransactionSchema.safeParse({
      ...baseFields,
      type: 'expense',
    });
    expect(result.success).toBe(true);
  });

  it('accepts payload with notes as optional string', () => {
    const result = createTransactionSchema.safeParse({
      ...baseFields,
      type: 'expense',
      notes: 'coffee run',
    });
    expect(result.success).toBe(true);
  });
});

describe('VAL-02 — transferTransactionSchema field rename', () => {
  it('rejects transfer payload with old toAccountId field (no counterpartAccountId)', () => {
    const result = createTransactionSchema.safeParse({
      ...baseFields,
      type: 'transfer',
      toAccountId: '550e8400-e29b-41d4-a716-446655440002',
    });
    expect(result.success).toBe(false);
  });

  it('accepts transfer payload with counterpartAccountId', () => {
    const result = createTransactionSchema.safeParse({
      ...baseFields,
      type: 'transfer',
      counterpartAccountId: '550e8400-e29b-41d4-a716-446655440002',
    });
    expect(result.success).toBe(true);
  });

  it('rejects transfer payload missing counterpartAccountId (it is required)', () => {
    const result = createTransactionSchema.safeParse({
      ...baseFields,
      type: 'transfer',
    });
    expect(result.success).toBe(false);
  });
});

describe('VAL-04 — all types require assignees', () => {
  it('rejects settlement without assignees', () => {
    const { assignees: _omit, ...withoutAssignees } = baseFields;
    const result = createTransactionSchema.safeParse({
      ...withoutAssignees,
      type: 'settlement',
    });
    expect(result.success).toBe(false);
  });

  it('accepts settlement with one assignee matching amount', () => {
    const result = createTransactionSchema.safeParse({
      ...baseFields,
      type: 'settlement',
      counterpartAccountId: '550e8400-e29b-41d4-a716-446655440002',
    });
    expect(result.success).toBe(true);
  });

  it('rejects settlement with assignees: []', () => {
    const result = createTransactionSchema.safeParse({
      ...baseFields,
      type: 'settlement',
      counterpartAccountId: '550e8400-e29b-41d4-a716-446655440002',
      assignees: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects refund without assignees', () => {
    const { assignees: _omit, ...withoutAssignees } = baseFields;
    const result = createTransactionSchema.safeParse({
      ...withoutAssignees,
      type: 'refund',
    });
    expect(result.success).toBe(false);
  });

  it('accepts refund with one assignee matching amount', () => {
    const result = createTransactionSchema.safeParse({
      ...baseFields,
      type: 'refund',
    });
    expect(result.success).toBe(true);
  });

  it('rejects income without assignees', () => {
    const { assignees: _omit, ...withoutAssignees } = baseFields;
    expect(
      createTransactionSchema.safeParse({
        ...withoutAssignees,
        type: 'income',
        incomeType: 'direct_deposit',
      }).success
    ).toBe(false);
  });

  it('rejects contribution without assignees', () => {
    const { assignees: _omit, ...withoutAssignees } = baseFields;
    expect(
      createTransactionSchema.safeParse({
        ...withoutAssignees,
        type: 'contribution',
      }).success
    ).toBe(false);
  });

  it('rejects refund with assignees: []', () => {
    const result = createTransactionSchema.safeParse({
      ...baseFields,
      type: 'refund',
      assignees: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('createTransactionSchema — counterpartAccountId required for two-account types', () => {
  const counterpartAccountId = '550e8400-e29b-41d4-a716-446655440002';

  it('rejects settlement missing counterpartAccountId', () => {
    const result = createTransactionSchema.safeParse({
      ...baseFields,
      type: 'settlement',
    });
    expect(result.success).toBe(false);
  });

  it('rejects contribution missing counterpartAccountId', () => {
    const result = createTransactionSchema.safeParse({
      ...baseFields,
      type: 'contribution',
    });
    expect(result.success).toBe(false);
  });

  it('accepts settlement with counterpartAccountId', () => {
    const result = createTransactionSchema.safeParse({
      ...baseFields,
      type: 'settlement',
      counterpartAccountId,
    });
    expect(result.success).toBe(true);
  });

  it('accepts contribution with counterpartAccountId', () => {
    const result = createTransactionSchema.safeParse({
      ...baseFields,
      type: 'contribution',
      counterpartAccountId,
    });
    expect(result.success).toBe(true);
  });
});

describe('VAL-05 — patchTransactionSchema', () => {
  it('rejects expense PATCH without assignees', () => {
    const { assignees: _omit, ...withoutAssignees } = baseFields;
    const result = patchTransactionSchema.safeParse({
      ...withoutAssignees,
      type: 'expense',
    });
    expect(result.success).toBe(false);
  });

  it('rejects expense PATCH with assignees: []', () => {
    const result = patchTransactionSchema.safeParse({
      ...baseFields,
      type: 'expense',
      assignees: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes('assignees'))
      ).toBe(true);
    }
  });

  it('accepts expense PATCH with at least one assignee', () => {
    const result = patchTransactionSchema.safeParse({
      ...baseFields,
      type: 'expense',
    });
    expect(result.success).toBe(true);
  });
});

describe('VAL-03 — updateTransactionSchema field changes', () => {
  it('accepts payload with counterpartAccountId as valid UUID', () => {
    const result = updateTransactionSchema.safeParse({
      counterpartAccountId: '550e8400-e29b-41d4-a716-446655440002',
    });
    expect(result.success).toBe(true);
  });

  it('accepts payload with counterpartAccountId absent (optional)', () => {
    const result = updateTransactionSchema.safeParse({
      amount: 2000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects assignees: [] (cannot clear splits with empty array via flat update schema)', () => {
    const result = updateTransactionSchema.safeParse({ assignees: [] });
    expect(result.success).toBe(false);
  });
});

describe('createTransactionSchema — category + import provenance', () => {
  it('rejects expense without categoryId', () => {
    const { categoryId: _omit, ...withoutCategory } = baseFields;
    expect(
      createTransactionSchema.safeParse({
        ...withoutCategory,
        type: 'expense',
      }).success
    ).toBe(false);
  });

  it('rejects refund without categoryId', () => {
    const { categoryId: _omit, ...withoutCategory } = baseFields;
    expect(
      createTransactionSchema.safeParse({
        ...withoutCategory,
        type: 'refund',
      }).success
    ).toBe(false);
  });

  it('accepts settlement without categoryId and with optional Bill Payment category', () => {
    const { categoryId: _omit, ...withoutCategory } = baseFields;
    expect(
      createTransactionSchema.safeParse({
        ...withoutCategory,
        type: 'settlement',
        counterpartAccountId: '550e8400-e29b-41d4-a716-446655440002',
      }).success
    ).toBe(true);
    expect(
      createTransactionSchema.safeParse({
        ...baseFields,
        type: 'settlement',
        counterpartAccountId: '550e8400-e29b-41d4-a716-446655440002',
      }).success
    ).toBe(true);
  });

  it('accepts import provenance on expense writes', () => {
    const result = createTransactionSchema.safeParse({
      ...baseFields,
      type: 'expense',
      importBatchId: '550e8400-e29b-41d4-a716-446655440010',
      rawDescription: 'COFFEE SHOP #42',
      externalId: 'visa-1001',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        importBatchId: '550e8400-e29b-41d4-a716-446655440010',
        rawDescription: 'COFFEE SHOP #42',
        externalId: 'visa-1001',
      });
    }
  });

  it('strips import provenance from PATCH payloads', () => {
    const result = patchTransactionSchema.safeParse({
      ...baseFields,
      type: 'expense',
      importBatchId: '550e8400-e29b-41d4-a716-446655440010',
      rawDescription: 'COFFEE SHOP #42',
      externalId: 'visa-1001',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('importBatchId');
      expect(result.data).not.toHaveProperty('rawDescription');
      expect(result.data).not.toHaveProperty('externalId');
    }
  });
});
