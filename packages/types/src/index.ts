// @ploutizo/types — Shared TypeScript interfaces and enums

export type AccountType =
  | 'chequing'
  | 'savings'
  | 'credit_card'
  | 'prepaid_cash'
  | 'e_transfer'
  | 'investment'
  | 'other'

export interface AccountOwner {
  id: string          // orgMembers.id (the member UUID)
  displayName: string
  imageUrl: string | null
}

export interface Account {
  id: string
  orgId: string
  name: string
  type: AccountType
  institution: string | null
  lastFour: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  owners: AccountOwner[]   // populated by listAccountMemberDetails join; [] for personal accounts
}

export interface AccountMember {
  id: string
  accountId: string
  memberId: string
}

export interface HouseholdSettings {
  settlementThreshold: number | null
}

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

export type PendingInvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface PendingInvitation {
  id: string;
  email: string;
  status: PendingInvitationStatus;
  createdAt: string;        // ISO 8601 string
  expiresAt: string | null; // ISO 8601 string or null when Clerk does not provide expires_at
}

export type SettlementStatus = 'due_soon' | 'on_track'

/**
 * Member projection in GET settlements — same semantics as OrgMember subsets:
 * `name` is the roster label (= `OrgMember.displayName`), `avatarUrl` is avatar (= `OrgMember.imageUrl`).
 * Names differ from `OrgMember` to match settlements JSON (`name`/`avatarUrl` on wire).
 */
export type SettlementMemberRowMember = Pick<OrgMember, 'id'> & {
  name: OrgMember['displayName']
  avatarUrl: OrgMember['imageUrl']
}

export interface SettlementMemberRow {
  member: SettlementMemberRowMember
  balanceCents: number
}

/**
 * Account projection in GET settlements — `Pick<Account, …>` plus `statementDueDay`
 * from the accounts table (not exposed on full `Account` list DTO).
 */
export type SettlementAccountRowAccount = Pick<
  Account,
  'id' | 'name' | 'type' | 'institution' | 'lastFour'
> & {
  statementDueDay: number | null
}

export interface SettlementAccountRow {
  account: SettlementAccountRowAccount
  totalBalanceCents: number
  members: SettlementMemberRow[]
  dueDate: string | null
  status: SettlementStatus | null
}

export interface GetSettlementBalancesResponse {
  accounts: SettlementAccountRow[]
}

export type TransactionSortField = 'date' | 'amount' | 'type' | 'category' | 'account'

export type SortOrder = 'asc' | 'desc'
