import { describe, expect, it } from 'vitest';
import { createSettlementSchema } from '@ploutizo/validators';
import type { SettlementAccountRow, SettlementStatus } from '@ploutizo/types';
import { settlementMember } from '@/test/settlementFixtures';
import { toCreateSettlementPayload } from './toCreateSettlementPayload';

const CARD_ID = '11111111-1111-4111-8111-111111111111';
const ALICE_ID = '22222222-2222-4222-8222-222222222222';
const BETTY_ID = '33333333-3333-4333-8333-333333333333';
const SOURCE_ID = '44444444-4444-4444-8444-444444444444';

const alice = settlementMember(ALICE_ID, 'Alice', 'Alice@example.com');
const betty = settlementMember(BETTY_ID, 'Betty', 'Betty@example.com');

const fixture = (): SettlementAccountRow => ({
  account: {
    id: CARD_ID,
    name: 'Test Card',
    type: 'credit_card',
    institutionId: null,
    lastFour: null,
    statementDueDay: null,
    owners: [alice],
  },
  totalBalanceCents: 700,
  sharedBalanceCents: 200,
  sharedParticipantIds: [ALICE_ID, BETTY_ID],
  members: [
    {
      member: alice,
      personalBalanceCents: 500,
    },
    {
      member: betty,
      personalBalanceCents: 0,
    },
  ],
  dueDate: null,
  status: null as SettlementStatus | null,
});

const formValue = (overrides: Record<string, unknown> = {}) => ({
  payToward: ALICE_ID,
  amountDollars: 12.34,
  sourceAccountId: SOURCE_ID,
  date: '2026-01-15',
  notes: '',
  ...overrides,
});

describe('toCreateSettlementPayload', () => {
  it('maps a personal settle to a single assignee and counterpart account', () => {
    const payload = toCreateSettlementPayload(fixture(), formValue());

    expect(payload).toEqual({
      assignees: [{ memberId: ALICE_ID }],
      accountId: CARD_ID,
      counterpartAccountId: SOURCE_ID,
      amountCents: 1234,
      date: '2026-01-15',
    });
    expect(payload).not.toHaveProperty('notes');
    expect(createSettlementSchema.safeParse(payload).success).toBe(true);
  });

  it('maps shared pay-toward to the card’s shared participant ids in order', () => {
    const payload = toCreateSettlementPayload(
      fixture(),
      formValue({ payToward: 'shared', amountDollars: 2 })
    );

    expect(payload.assignees).toEqual([
      { memberId: ALICE_ID },
      { memberId: BETTY_ID },
    ]);
    expect(payload.amountCents).toBe(200);
    expect(createSettlementSchema.safeParse(payload).success).toBe(true);
  });

  it('rounds dollars to integer cents', () => {
    const payload = toCreateSettlementPayload(
      fixture(),
      formValue({ amountDollars: 12.345 })
    );
    expect(payload.amountCents).toBe(1235);
  });

  it('omits whitespace-only notes', () => {
    const payload = toCreateSettlementPayload(
      fixture(),
      formValue({ notes: '   ' })
    );
    expect(payload).not.toHaveProperty('notes');
  });

  it('omits undefined notes', () => {
    const payload = toCreateSettlementPayload(
      fixture(),
      formValue({ notes: undefined })
    );
    expect(payload).not.toHaveProperty('notes');
  });

  it('forwards trimmed notes when present', () => {
    const payload = toCreateSettlementPayload(
      fixture(),
      formValue({ notes: '  paid at branch  ' })
    );
    expect(payload.notes).toBe('paid at branch');
    expect(createSettlementSchema.safeParse(payload).success).toBe(true);
  });
});
