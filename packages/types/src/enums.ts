/**
 * Domain enum literals aligned with Postgres / Drizzle pgEnum definitions.
 * Single source: `as const` maps; types are `keyof typeof map`.
 * `*_VALUES` tuples are derived for Zod `z.enum()`.
 */

const toEnumTuple = <const T extends Record<string, string>>(map: T) =>
  Object.values(map) as [keyof T & string, ...(keyof T & string)[]];

export const accountTypes = {
  chequing: 'chequing',
  savings: 'savings',
  credit_card: 'credit_card',
  prepaid_cash: 'prepaid_cash',
  e_transfer: 'e_transfer',
  investment: 'investment',
  other: 'other',
} as const;

export type AccountType = keyof typeof accountTypes;

export const ACCOUNT_TYPE_VALUES = toEnumTuple(accountTypes);

export const transactionTypes = {
  expense: 'expense',
  refund: 'refund',
  income: 'income',
  transfer: 'transfer',
  settlement: 'settlement',
  contribution: 'contribution',
} as const;

export type TransactionType = keyof typeof transactionTypes;

export const TRANSACTION_TYPE_VALUES = toEnumTuple(transactionTypes);

export const incomeTypes = {
  direct_deposit: 'direct_deposit',
  e_transfer: 'e_transfer',
  cash: 'cash',
  cheque: 'cheque',
  other: 'other',
} as const;

export type IncomeType = keyof typeof incomeTypes;

export const INCOME_TYPE_VALUES = toEnumTuple(incomeTypes);

export const merchantMatchTypes = {
  exact: 'exact',
  contains: 'contains',
  starts_with: 'starts_with',
  ends_with: 'ends_with',
  regex: 'regex',
} as const;

export type MerchantMatchType = keyof typeof merchantMatchTypes;

export const MERCHANT_MATCH_TYPE_VALUES = toEnumTuple(merchantMatchTypes);

/** Transaction types included in settlement balance aggregates (ADR 0003). */
export const settlementQualifyingTransactionTypes = {
  expense: transactionTypes.expense,
  refund: transactionTypes.refund,
  settlement: transactionTypes.settlement,
} as const;

export type SettlementQualifyingTransactionType =
  keyof typeof settlementQualifyingTransactionTypes;

export const SETTLEMENT_QUALIFYING_TRANSACTION_TYPE_VALUES = toEnumTuple(
  settlementQualifyingTransactionTypes
);
