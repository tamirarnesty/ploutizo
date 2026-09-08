import type { Account } from './accounts';
import type { MemberIdentity } from './org';

export type SettlementStatus = 'due_soon' | 'on_track';

export interface SettlementMemberRow {
  member: MemberIdentity;
  personalBalanceCents: number;
}

/**
 * Account projection in GET settlements.
 * `owners` mirrors `account_members` (same source as GET /accounts).
 */
export type SettlementAccountRowAccount = Pick<
  Account,
  | 'id'
  | 'name'
  | 'type'
  | 'institutionId'
  | 'lastFour'
  | 'statementDueDay'
  | 'owners'
>;

export interface SettlementAccountRow {
  account: SettlementAccountRowAccount;
  totalBalanceCents: number;
  sharedBalanceCents: number;
  sharedParticipantIds: string[];
  members: SettlementMemberRow[];
  dueDate: string | null;
  status: SettlementStatus | null;
}

export interface GetSettlementBalancesResponse {
  accounts: SettlementAccountRow[];
}
