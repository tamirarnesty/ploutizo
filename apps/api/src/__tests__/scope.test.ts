import { describe, expect, it } from 'vitest';
import {
  activeAccounts,
  activeTransactions,
  assigneeCountsForOrg,
  settlementQualifying,
} from '@/lib/queries/scope';

describe('scope query builders', () => {
  it('activeTransactions returns org and deleted_at predicates', () => {
    expect(activeTransactions('org_a')).toHaveLength(2);
  });

  it('activeAccounts returns org and archived predicates', () => {
    expect(activeAccounts('org_a')).toHaveLength(2);
  });

  it('settlementQualifying is a single composed predicate', () => {
    expect(settlementQualifying('org_a')).toBeDefined();
  });

  it('assigneeCountsForOrg returns a per-call subquery alias (not module singleton)', () => {
    const a = assigneeCountsForOrg('org_a');
    const b = assigneeCountsForOrg('org_b');
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(a).not.toBe(b);
  });
});
