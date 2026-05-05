import type { PendingInvitationStatus } from '@ploutizo/types';

export interface ExpiryInfo {
  label: string;
  className: string;
}

// Per D-11: Clerk's `status` field is authoritative for the 'Expired' state.
// Days remaining is computed from expiresAt for label text only — never to detect expiry.
export function getExpiryInfo(
  expiresAt: string | null,
  status: PendingInvitationStatus
): ExpiryInfo | null {
  if (status === 'expired') {
    return { label: 'Expired', className: 'text-destructive' };
  }
  if (!expiresAt) return null;
  const daysLeft = Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return {
    label: `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    className:
      daysLeft <= 2 ? 'text-warning-foreground' : 'text-muted-foreground',
  };
}
