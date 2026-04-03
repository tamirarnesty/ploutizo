// @ploutizo/types — Shared TypeScript interfaces and enums

export type AccountType =
  | 'chequing'
  | 'savings'
  | 'credit_card'
  | 'prepaid_cash'
  | 'e_transfer'
  | 'investment'
  | 'other'

export interface Account {
  id: string
  orgId: string
  name: string
  type: AccountType
  institution: string | null
  lastFour: string | null
  eachPersonPaysOwn: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
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
}
