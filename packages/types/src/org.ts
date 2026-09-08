export type PendingInvitationStatus =
  | 'pending'
  | 'accepted'
  | 'revoked'
  | 'expired';

export interface OrgMember {
  id: string;
  orgId: string;
  role: 'admin';
  joinedAt: string;
  externalId: string;
  email: string;
  imageUrl: string | null;
  firstName: string | null;
  lastName: string | null;
}

/** Clerk person projection shared by roster embeds (owners, settlement rows, etc.). */
export type MemberIdentity = Pick<
  OrgMember,
  'id' | 'firstName' | 'lastName' | 'email' | 'imageUrl'
>;

export interface PendingInvitation {
  id: string;
  email: string;
  status: PendingInvitationStatus;
  createdAt: string; // ISO 8601 string
  expiresAt: string | null; // ISO 8601 string or null when Clerk does not provide expires_at
}
