import type { AccountType, TransactionType } from '@ploutizo/types';

export type AccountRole =
  | 'expense_account'
  | 'refund_account'
  | 'income_account'
  | 'transfer_source_account'
  | 'transfer_destination_account'
  | 'settlement_scoped_account'
  | 'settlement_funding_account'
  | 'contribution_source_account'
  | 'contribution_destination_account';

export type TransactionAccountSlot = 'accountId' | 'counterpartAccountId';

export type ScalarFieldRelevance = 'required' | 'optional';

export type TransactionScalarField =
  | 'categoryId'
  | 'refundOf'
  | 'incomeType'
  | 'notes';

export type DescriptionMode = 'manual' | 'generated' | 'conditional_generated';

export type DescriptionSource = 'account_pair' | 'linked_refund';

export type RelationshipRule = 'different_accounts';

export type ResolvedDescriptionMode = 'manual' | 'generated';

export interface AccountSlotPolicyReadModel {
  field: TransactionAccountSlot;
  role: AccountRole;
  required: boolean;
  allowedAccountTypes: readonly AccountType[];
  relationshipRules: readonly RelationshipRule[];
}

export interface TransactionTypePolicyReadModel {
  type: TransactionType;
  accountSlots: readonly AccountSlotPolicyReadModel[];
  scalarFields: Readonly<
    Partial<Record<TransactionScalarField, ScalarFieldRelevance>>
  >;
  description: {
    mode: DescriptionMode;
    source?: DescriptionSource;
  };
}

export interface ResolveTransactionDescriptionPolicyInput {
  type: TransactionType;
  refundOf?: string | null;
}

export interface ResolvedTransactionDescriptionPolicy {
  mode: ResolvedDescriptionMode;
}

export interface TransactionAccountReference {
  id: string;
  type: AccountType;
}

export interface ValidateTransactionAccountPolicyInput {
  type: TransactionType;
  account: TransactionAccountReference;
  counterpartAccount?: TransactionAccountReference | null;
}

export interface TransactionAccountPolicyViolation {
  field: TransactionAccountSlot;
  code:
    | 'missing_account'
    | 'disallowed_account_type'
    | 'same_account_not_allowed';
  message: string;
}

export interface ValidateTransactionAccountPolicyResult {
  valid: boolean;
  violations: TransactionAccountPolicyViolation[];
}

export interface TransactionAccountOption {
  id: string;
  name: string;
  type: AccountType;
  archivedAt: string | null;
}

export interface GetAccountOptionsForTransactionSlotInput {
  type: TransactionType;
  slot: TransactionAccountSlot;
  accounts: readonly TransactionAccountOption[];
  /** Excludes this account when `different_accounts` applies to the slot. */
  otherSelectedAccountId?: string | null;
  /** Keeps an archived account visible when editing an existing selection. */
  preserveAccountId?: string | null;
}
