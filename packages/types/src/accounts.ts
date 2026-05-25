import type { AccountType } from './enums'

export interface AccountOwner {
  id: string // orgMembers.id (the member UUID)
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
  owners: AccountOwner[] // populated by listAccountMemberDetails join; [] for personal accounts
}

export interface AccountMember {
  id: string
  accountId: string
  memberId: string
}
