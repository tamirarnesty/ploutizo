import { memberShortLabel } from '@ploutizo/utils';
import type { OrgMember } from '@ploutizo/types';

export const householdShortLabel = (
  memberId: string,
  household: readonly OrgMember[],
  fallback: string
): string => {
  const member = household.find((row) => row.id === memberId);
  return member ? memberShortLabel(member, household) : fallback;
};
