import type { AccessState } from './access-state';

export const accessKey = (access: AccessState): string => {
  if (access.status === 'signed-out') {
    return 'signed-out';
  }
  if (access.status === 'signed-in-no-household') {
    return `member:${access.signedInMemberId}`;
  }
  return `household:${access.signedInMemberId}:${access.activeHouseholdId}`;
};
