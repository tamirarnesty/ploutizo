import { getTransactionTypePolicy } from '@ploutizo/utils/transaction-policy';
import type {
  AccountRole,
  AccountSlotPolicyReadModel,
  TransactionAccountSlot,
} from '@ploutizo/utils/transaction-policy';
import type { AccountType, TransactionType } from '@ploutizo/types';

export type TransactionFormAccountSlotLabel =
  | 'Account'
  | 'Source'
  | 'Destination';

export interface TransactionFormAccountSlot {
  field: TransactionAccountSlot;
  role: AccountRole;
  required: boolean;
  label: TransactionFormAccountSlotLabel;
  /** First allowed account type for the slot's role — used to prefill create. */
  createAccountType: AccountType;
}

const ACCOUNT_SLOT_LABELS: Record<
  AccountRole,
  TransactionFormAccountSlotLabel
> = {
  expense_account: 'Account',
  refund_account: 'Account',
  income_account: 'Account',
  transfer_source_account: 'Source',
  transfer_destination_account: 'Destination',
  settlement_scoped_account: 'Destination',
  settlement_funding_account: 'Source',
  contribution_source_account: 'Source',
  contribution_destination_account: 'Destination',
};

const SLOT_DISPLAY_RANK: Record<TransactionFormAccountSlotLabel, number> = {
  Source: 0,
  Account: 0,
  Destination: 1,
};

const toFormAccountSlot = (
  slot: AccountSlotPolicyReadModel
): TransactionFormAccountSlot => ({
  field: slot.field,
  role: slot.role,
  required: slot.required,
  label: ACCOUNT_SLOT_LABELS[slot.role],
  createAccountType: slot.allowedAccountTypes[0],
});

/**
 * Web copy/layout adapter over `getTransactionTypePolicy` account slots.
 * Source is shown left of Destination for two-account types; settlement’s
 * funding counterpart is Source even though it is not `accountId`.
 */
export const getTransactionFormAccountSlots = (
  type: TransactionType
): TransactionFormAccountSlot[] =>
  getTransactionTypePolicy(type)
    .accountSlots.map(toFormAccountSlot)
    .sort(
      (left, right) =>
        SLOT_DISPLAY_RANK[left.label] - SLOT_DISPLAY_RANK[right.label]
    );
