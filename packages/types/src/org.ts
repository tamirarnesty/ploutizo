export type PendingInvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export interface OrgMember {
  id: string
  orgId: string
  displayName: string
  role: 'admin'
  joinedAt: string
  externalId: string
  imageUrl: string | null
  firstName: string | null
  lastName: string | null
}

export interface PendingInvitation {
  id: string
  email: string
  status: PendingInvitationStatus
  createdAt: string // ISO 8601 string
  expiresAt: string | null // ISO 8601 string or null when Clerk does not provide expires_at
}
