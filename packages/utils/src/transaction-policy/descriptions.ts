import type { TransactionType } from '@ploutizo/types';

/** Shown while account names are still resolving in generated description previews. */
export const PLACEHOLDER_ACCOUNT_NAME = '…';

/** Auto-filled settlement transaction description (card = accountId, paidFrom = counterpartAccountId). */
export const formatSettlementDescription = (
  cardAccountName: string,
  paidFromAccountName?: string | null
): string =>
  paidFromAccountName
    ? `Settlement from ${paidFromAccountName} to ${cardAccountName}`
    : `Settlement: ${cardAccountName}`;

export const formatTransferDescription = (
  sourceAccountName: string,
  destinationAccountName: string
): string => `Transfer from ${sourceAccountName} to ${destinationAccountName}`;

export const formatContributionDescription = (
  sourceAccountName: string,
  destinationAccountName: string
): string =>
  `Contribution from ${sourceAccountName} to ${destinationAccountName}`;

export const formatLinkedRefundDescription = (
  originalDescription: string
): string => `Refund of ${originalDescription}`;

export interface GeneratedTransactionDescriptionInput {
  type: TransactionType;
  accountName: string;
  counterpartAccountName?: string | null;
  refundOriginalDescription?: string | null;
  refundOf?: string | null;
}

export interface GeneratedTransactionDescriptionFromAccountsInput {
  type: TransactionType;
  accountId: string;
  counterpartAccountId?: string | null;
  refundOf?: string | null;
  accountName?: string | null;
  counterpartAccountName?: string | null;
  refundOriginalDescription?: string | null;
}

export interface TransactionDescriptionAccount {
  id: string;
  name: string;
}

/** Canonical auto-generated description for policy-driven transaction types. */
export const formatGeneratedTransactionDescription = (
  input: GeneratedTransactionDescriptionInput
): string => {
  switch (input.type) {
    case 'transfer':
      return formatTransferDescription(
        input.accountName,
        input.counterpartAccountName ?? PLACEHOLDER_ACCOUNT_NAME
      );
    case 'settlement': {
      const paidFromName = input.counterpartAccountName ?? undefined;
      return formatSettlementDescription(input.accountName, paidFromName);
    }
    case 'contribution':
      return formatContributionDescription(
        input.accountName,
        input.counterpartAccountName ?? PLACEHOLDER_ACCOUNT_NAME
      );
    case 'refund':
      return input.refundOf && input.refundOriginalDescription
        ? formatLinkedRefundDescription(input.refundOriginalDescription)
        : '';
    default:
      return '';
  }
};

const resolveCounterpartAccountName = (
  input: GeneratedTransactionDescriptionFromAccountsInput,
  counterpartAccount: TransactionDescriptionAccount | undefined
): string | null | undefined => {
  if (input.counterpartAccountId) {
    return (
      counterpartAccount?.name ??
      input.counterpartAccountName ??
      PLACEHOLDER_ACCOUNT_NAME
    );
  }

  if (input.type === 'settlement') {
    return undefined;
  }

  return PLACEHOLDER_ACCOUNT_NAME;
};

export const formatGeneratedTransactionDescriptionFromAccounts = (
  input: GeneratedTransactionDescriptionFromAccountsInput,
  accounts: readonly TransactionDescriptionAccount[]
): string => {
  const primaryAccount = accounts.find((account) => account.id === input.accountId);
  const counterpartAccount = accounts.find(
    (account) => account.id === input.counterpartAccountId
  );
  const accountName =
    primaryAccount?.name ?? input.accountName ?? PLACEHOLDER_ACCOUNT_NAME;
  const counterpartAccountName = resolveCounterpartAccountName(
    input,
    counterpartAccount
  );

  return formatGeneratedTransactionDescription({
    type: input.type,
    accountName,
    counterpartAccountName,
    refundOf: input.refundOf,
    refundOriginalDescription: input.refundOriginalDescription,
  });
};
