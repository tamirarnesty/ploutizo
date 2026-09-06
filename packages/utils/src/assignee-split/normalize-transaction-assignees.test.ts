import { describe, expect, it } from 'vitest';
import { normalizeTransactionAssignees } from './normalize-transaction-assignees';

describe('normalizeTransactionAssignees', () => {
  it('sets full amount and 100% for a single assignee', () => {
    expect(
      normalizeTransactionAssignees(1976, [
        { memberId: 'm1', amountCents: 1, percentage: 50 },
      ])
    ).toEqual([{ memberId: 'm1', amountCents: 1976, percentage: 100 }]);
  });

  it('uses LRM for multi-assignee even splits', () => {
    expect(
      normalizeTransactionAssignees(100, [
        { memberId: 'm1', amountCents: 50, percentage: 50 },
        { memberId: 'm2', amountCents: 50, percentage: 50 },
      ])
    ).toEqual([
      { memberId: 'm1', amountCents: 50, percentage: 50 },
      { memberId: 'm2', amountCents: 50, percentage: 50 },
    ]);
  });

  it('derives percentages for custom multi-assignee splits', () => {
    expect(
      normalizeTransactionAssignees(100, [
        { memberId: 'm1', amountCents: 60, percentage: 50 },
        { memberId: 'm2', amountCents: 40, percentage: 50 },
      ])
    ).toEqual([
      { memberId: 'm1', amountCents: 60, percentage: 60 },
      { memberId: 'm2', amountCents: 40, percentage: 40 },
    ]);
  });
});
