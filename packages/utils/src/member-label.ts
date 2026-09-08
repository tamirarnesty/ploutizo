export type MemberLabelFields = {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
};

const trimmed = (value: string | null | undefined): string =>
  value?.trim() ?? '';

export const memberFullLabel = (member: MemberLabelFields): string => {
  const joined = [trimmed(member.firstName), trimmed(member.lastName)]
    .filter(Boolean)
    .join(' ');
  if (joined) return joined;
  return trimmed(member.email) || '—';
};

export const memberShortLabel = (
  member: MemberLabelFields,
  household: readonly MemberLabelFields[]
): string => {
  const firstName = trimmed(member.firstName);
  if (!firstName) return memberFullLabel(member);
  const sameFirst = household.filter(
    (other) => trimmed(other.firstName) === firstName
  );
  if (sameFirst.length > 1) return memberFullLabel(member);
  return firstName;
};
