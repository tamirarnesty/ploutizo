import type { TransactionAccountSlot } from './types';

export type ArchivedAtValue = string | Date | null | undefined;

export type ArchivedAccountDateViolation = {
  field: TransactionAccountSlot;
  code: 'activity_after_archive_date';
  message: string;
};

export type ValidateArchivedAccountAvailabilityInput = {
  date: string;
  account: { archivedAt: ArchivedAtValue };
  counterpartAccount?: { archivedAt: ArchivedAtValue } | null;
};

export type ValidateArchivedAccountAvailabilityResult = {
  valid: boolean;
  violations: ArchivedAccountDateViolation[];
};

const CALENDAR_DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;

const hasArchiveInstant = (
  archivedAt: ArchivedAtValue
): archivedAt is string | Date => archivedAt != null && archivedAt !== '';

/** UTC calendar date (`yyyy-MM-dd`) for a transaction date or `archivedAt`. */
export const toCalendarDate = (value: string | Date): string | null => {
  if (typeof value === 'string') {
    const match = CALENDAR_DATE_PREFIX.exec(value.trim());
    if (match) return match[1];
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  }

  if (Number.isNaN(value.getTime())) return null;
  return value.toISOString().slice(0, 10);
};

export const isAccountAvailableOnCalendarDate = (
  archivedAt: ArchivedAtValue,
  transactionDate: string
): boolean => {
  if (!hasArchiveInstant(archivedAt)) return true;
  const archiveDate = toCalendarDate(archivedAt);
  const asOf = toCalendarDate(transactionDate);
  if (!archiveDate || !asOf) return false;
  return asOf <= archiveDate;
};

/** Earliest archive calendar date among archived accounts, or null if none. */
export const getLastAvailableCalendarDate = (
  archivedAts: readonly ArchivedAtValue[]
): string | null => {
  const dates = archivedAts
    .filter(hasArchiveInstant)
    .map((value) => toCalendarDate(value))
    .filter((value): value is string => value !== null)
    .sort();
  return dates[0] ?? null;
};

const slotMessage = (field: TransactionAccountSlot): string =>
  field === 'accountId'
    ? 'This account cannot receive activity after its archive date.'
    : 'The counterpart account cannot receive activity after its archive date.';

const violationFor = (
  field: TransactionAccountSlot,
  archivedAt: ArchivedAtValue,
  date: string
): ArchivedAccountDateViolation | null => {
  if (isAccountAvailableOnCalendarDate(archivedAt, date)) return null;
  return {
    field,
    code: 'activity_after_archive_date',
    message: slotMessage(field),
  };
};

/**
 * Calendar-date availability for transaction create/edit. Not part of
 * `validateTransactionAccountPolicy` so import settlement-funding stays fenced.
 */
export const validateArchivedAccountAvailability = (
  input: ValidateArchivedAccountAvailabilityInput
): ValidateArchivedAccountAvailabilityResult => {
  const violations: ArchivedAccountDateViolation[] = [];
  const accountViolation = violationFor(
    'accountId',
    input.account.archivedAt,
    input.date
  );
  if (accountViolation) violations.push(accountViolation);

  if (input.counterpartAccount) {
    const counterpartViolation = violationFor(
      'counterpartAccountId',
      input.counterpartAccount.archivedAt,
      input.date
    );
    if (counterpartViolation) violations.push(counterpartViolation);
  }

  return {
    valid: violations.length === 0,
    violations,
  };
};
