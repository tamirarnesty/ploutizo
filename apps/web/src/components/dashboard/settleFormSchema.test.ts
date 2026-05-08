import { describe, expect, it } from 'vitest';
import { settleFormSchema } from './settleFormSchema';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_BASE = {
  payerMemberId: VALID_UUID,
  amountDollars: 42.5,
  sourceAccountId: 'acc-001',
  date: '2026-05-01',
  notes: undefined,
};

describe('settleFormSchema', () => {
  // amountDollars
  it('passes with a positive amount', () => {
    expect(settleFormSchema.safeParse(VALID_BASE).success).toBe(true);
  });

  it('rejects amount = 0 (z.number().positive() excludes 0)', () => {
    const result = settleFormSchema.safeParse({
      ...VALID_BASE,
      amountDollars: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = settleFormSchema.safeParse({
      ...VALID_BASE,
      amountDollars: -1,
    });
    expect(result.success).toBe(false);
  });

  // notes
  it('passes when notes is undefined', () => {
    expect(
      settleFormSchema.safeParse({ ...VALID_BASE, notes: undefined }).success
    ).toBe(true);
  });

  it('passes when notes is an empty string', () => {
    // z.string().max(1000).optional() accepts "" — stripping happens in SettleDialog onSubmit
    expect(
      settleFormSchema.safeParse({ ...VALID_BASE, notes: '' }).success
    ).toBe(true);
  });

  it('passes when notes is exactly 1000 chars', () => {
    const notes = 'a'.repeat(1000);
    expect(settleFormSchema.safeParse({ ...VALID_BASE, notes }).success).toBe(
      true
    );
  });

  it('rejects notes longer than 1000 chars', () => {
    const notes = 'a'.repeat(1001);
    const result = settleFormSchema.safeParse({ ...VALID_BASE, notes });
    expect(result.success).toBe(false);
  });

  // date
  it('rejects missing date', () => {
    const result = settleFormSchema.safeParse({ ...VALID_BASE, date: '' });
    expect(result.success).toBe(false);
  });

  it('passes with a valid date string', () => {
    expect(
      settleFormSchema.safeParse({ ...VALID_BASE, date: '2026-01-15' }).success
    ).toBe(true);
  });
});
