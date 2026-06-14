import { describe, expect, it } from 'vitest';
import {
  settleAmountDollarsFieldSchema,
  settleFormSchema,
} from './settleFormSchema';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_BASE = {
  payToward: VALID_UUID,
  amountDollars: 42.5,
  sourceAccountId: '123e4567-e89b-12d3-a456-426614174001',
  date: '2026-05-01',
  notes: undefined,
};

describe('settleFormSchema', () => {
  // amountDollars
  it('passes with a positive amount', () => {
    expect(settleFormSchema.safeParse(VALID_BASE).success).toBe(true);
  });

  it('rejects amount = 0 on submit schema', () => {
    const result = settleFormSchema.safeParse({
      ...VALID_BASE,
      amountDollars: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects sub-cent positive amounts on submit schema', () => {
    const result = settleFormSchema.safeParse({
      ...VALID_BASE,
      amountDollars: 0.004,
    });
    expect(result.success).toBe(false);
  });

  it('allows amount = 0 on field schema', () => {
    expect(settleAmountDollarsFieldSchema.safeParse(0).success).toBe(true);
  });

  it('rejects negative amount', () => {
    expect(settleAmountDollarsFieldSchema.safeParse(-1).success).toBe(false);
    expect(
      settleFormSchema.safeParse({ ...VALID_BASE, amountDollars: -1 }).success
    ).toBe(false);
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

  it('rejects invalid date strings', () => {
    expect(
      settleFormSchema.safeParse({ ...VALID_BASE, date: 'not-a-date' }).success
    ).toBe(false);
    expect(
      settleFormSchema.safeParse({ ...VALID_BASE, date: '2026-02-30' }).success
    ).toBe(false);
  });
});
