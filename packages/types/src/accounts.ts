import type { AccountType } from './enums';
import type { FinancialInstitutionId } from './financial-institutions';

export interface AccountOwner {
  id: string; // orgMembers.id (the member UUID)
  displayName: string;
  imageUrl: string | null;
}

export interface Account {
  id: string;
  orgId: string;
  name: string;
  type: AccountType;
  institutionId: FinancialInstitutionId | null;
  lastFour: string | null;
  /** Day of month 1–31 on credit cards; null when unset or the account is not a card. */
  statementDueDay: number | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Account ownership: household members on this account (may be empty on legacy rows). */
  owners: AccountOwner[];
}

export interface AccountMember {
  id: string;
  accountId: string;
  memberId: string;
}
