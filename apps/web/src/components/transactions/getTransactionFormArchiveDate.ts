import {
  getLastAvailableCalendarDate,
  validateArchivedAccountAvailability,
} from '@ploutizo/utils/transaction-policy';
import type { Account } from '@ploutizo/types';

const findAccount = (
  accounts: readonly Account[],
  accountId: string
): Account | null =>
  accountId
    ? (accounts.find((account) => account.id === accountId) ?? null)
    : null;

export const getTransactionFormLastAvailableDate = (
  accounts: readonly Account[],
  accountId: string,
  counterpartAccountId: string
): string | null =>
  getLastAvailableCalendarDate([
    findAccount(accounts, accountId)?.archivedAt,
    findAccount(accounts, counterpartAccountId)?.archivedAt,
  ]);

export const getTransactionFormArchiveDateError = ({
  accounts,
  date,
  accountId,
  counterpartAccountId,
  field,
}: {
  accounts: readonly Account[];
  date: string;
  accountId: string;
  counterpartAccountId?: string;
  field?: 'accountId' | 'counterpartAccountId';
}): string | undefined => {
  const account = findAccount(accounts, accountId);
  const counterpartAccount = findAccount(accounts, counterpartAccountId ?? '');
  const result = validateArchivedAccountAvailability({
    date,
    account: { archivedAt: account?.archivedAt ?? null },
    counterpartAccount: counterpartAccount
      ? { archivedAt: counterpartAccount.archivedAt }
      : null,
  });
  const violation = field
    ? result.violations.find((item) => item.field === field)
    : result.violations[0];
  return violation?.message;
};

export const getTransactionFormAccountOptionLabel = (
  account: Pick<Account, 'name' | 'archivedAt'>
): string => (account.archivedAt ? `${account.name} (archived)` : account.name);
