import type { MemberIdentity } from '@ploutizo/types';

export const memberIdentity = (
  overrides: Partial<MemberIdentity> & Pick<MemberIdentity, 'id'>
): MemberIdentity => ({
  firstName: null,
  lastName: null,
  email: `${overrides.id}@example.com`,
  imageUrl: null,
  ...overrides,
});
