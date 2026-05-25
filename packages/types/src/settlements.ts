import type { Account } from './accounts'
import type { OrgMember } from './org'

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
  personalBalanceCents: number
}

/**
 * Account projection in GET settlements — `Pick<Account, …>` plus `statementDueDay`
 * from the accounts table (not exposed on full `Account` list DTO).
 * `owners` mirrors `account_members` (same source as GET /accounts).
 */
export type SettlementAccountRowAccount = Pick<
  Account,
  'id' | 'name' | 'type' | 'institution' | 'lastFour' | 'owners'
> & {
  statementDueDay: number | null
}

export interface SettlementAccountRow {
  account: SettlementAccountRowAccount
  totalBalanceCents: number
  sharedBalanceCents: number
  sharedParticipantIds: string[]
  members: SettlementMemberRow[]
  dueDate: string | null
  status: SettlementStatus | null
}

export interface GetSettlementBalancesResponse {
  accounts: SettlementAccountRow[]
}
