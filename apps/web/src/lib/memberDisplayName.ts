import type { OrgMember } from '@ploutizo/types';

/** First name from a roster display name (whitespace-delimited). */
export const getFirstNameFromDisplayName = (displayName: string): string => {
  const trimmed = displayName.trim();
  if (!trimmed) return '—';
  return trimmed.split(/\s+/)[0] ?? '—';
};

/** Prefer Clerk firstName, then first token of displayName. */
export const getOrgMemberFirstName = (member: OrgMember): string => {
  const firstName = member.firstName?.trim();
  if (firstName) return firstName;
  const [fromDisplay] = member.displayName.trim().split(/\s+/);
  return fromDisplay || member.displayName;
};
