import { describe, expect, it } from 'vitest';
import { testActiveHouseholdAccess } from '@/test/household-access';
import type { ActiveHouseholdAccess } from '@/lib/auth/access-policy';
import { importDraftQueryKey, importPreparedQueryKey } from './queryKeys';

const otherHousehold: ActiveHouseholdAccess = {
  ...testActiveHouseholdAccess,
  activeHouseholdId: 'org_other',
};

describe('import draft and prepared query keys', () => {
  it('does not collide across active households for the same draft', () => {
    expect(
      importDraftQueryKey(testActiveHouseholdAccess, 'draft_1')
    ).not.toEqual(importDraftQueryKey(otherHousehold, 'draft_1'));
  });

  it('does not collide across active households for the same prepared import', () => {
    expect(
      importPreparedQueryKey(testActiveHouseholdAccess, 'draft_1')
    ).not.toEqual(importPreparedQueryKey(otherHousehold, 'draft_1'));
  });
});
