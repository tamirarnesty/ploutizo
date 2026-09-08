import type { MemberIdentity } from '@ploutizo/types';

type MemberLabelSource = Pick<
  MemberIdentity,
  'firstName' | 'lastName' | 'email'
>;

const trimmed = (value: string | null | undefined): string =>
  value?.trim() ?? '';

const normalizedFirstName = (value: string | null | undefined): string =>
  trimmed(value).toLowerCase();

export const memberFullLabel = (member: MemberLabelSource): string => {
  const joined = [trimmed(member.firstName), trimmed(member.lastName)]
    .filter(Boolean)
    .join(' ');
  if (joined) return joined;
  return trimmed(member.email) || '—';
};

export const memberShortLabel = (
  member: MemberLabelSource,
  household: readonly MemberLabelSource[]
): string => {
  const firstName = trimmed(member.firstName);
  if (!firstName) return memberFullLabel(member);
  const sameFirst = household.filter(
    (other) =>
      normalizedFirstName(other.firstName) === normalizedFirstName(firstName)
  );
  if (sameFirst.length > 1) return memberFullLabel(member);
  return firstName;
};
