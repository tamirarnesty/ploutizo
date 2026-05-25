/**
 * Domain enum literals — single source for Postgres pgEnum, Zod `z.enum()`, and TS types.
 *
 * `*_VALUES` tuples are the source of truth. Types are `(typeof *_VALUES)[number]`.
 * `packages/db` passes these into Drizzle `pgEnum()`.
 */

// ---------------------------------------------------------------------------
// Auth / org
// ---------------------------------------------------------------------------

export const MEMBER_ROLE_VALUES = [
  'admin', // All members are admin in v1 — field reserved for future use
] as const

export type MemberRole = (typeof MEMBER_ROLE_VALUES)[number]

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export const ACCOUNT_TYPE_VALUES = [
  'chequing',
  'savings',
  'credit_card',
  'prepaid_cash',
  'e_transfer',
  'investment',
  'other',
] as const

export type AccountType = (typeof ACCOUNT_TYPE_VALUES)[number]

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export const TRANSACTION_TYPE_VALUES = [
  'expense',
  'refund',
  'income',
  'transfer',
  'settlement',
  'contribution',
] as const

export type TransactionType = (typeof TRANSACTION_TYPE_VALUES)[number]

export const INCOME_TYPE_VALUES = [
  'direct_deposit',
  'e_transfer',
  'cash',
  'cheque',
  'other',
] as const

export type IncomeType = (typeof INCOME_TYPE_VALUES)[number]

/** Transaction types included in settlement balance aggregates (ADR 0003). */
export const SETTLEMENT_QUALIFYING_TRANSACTION_TYPE_VALUES = [
  'expense',
  'refund',
  'settlement',
] as const satisfies readonly TransactionType[]

export type SettlementQualifyingTransactionType =
  (typeof SETTLEMENT_QUALIFYING_TRANSACTION_TYPE_VALUES)[number]

// ---------------------------------------------------------------------------
// Recurring
// ---------------------------------------------------------------------------

export const RECURRING_FREQUENCY_VALUES = [
  'daily',
  'weekly',
  'bi_weekly',
  'monthly',
  'yearly',
] as const

export type RecurringFrequency = (typeof RECURRING_FREQUENCY_VALUES)[number]

export const RECURRING_STATUS_VALUES = ['active', 'stopped'] as const

export type RecurringStatus = (typeof RECURRING_STATUS_VALUES)[number]

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export const MERCHANT_MATCH_TYPE_VALUES = [
  'exact',
  'contains',
  'starts_with',
  'ends_with',
  'regex',
] as const

export type MerchantMatchType = (typeof MERCHANT_MATCH_TYPE_VALUES)[number]

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

export const BUDGET_PERIOD_TYPE_VALUES = [
  'monthly',
  'weekly',
  'bi_weekly',
  'yearly',
  'custom',
] as const

export type BudgetPeriodType = (typeof BUDGET_PERIOD_TYPE_VALUES)[number]

// ---------------------------------------------------------------------------
// Investments
// ---------------------------------------------------------------------------

export const INVESTMENT_TYPE_VALUES = [
  'tfsa',
  'rrsp',
  'fhsa',
  'resp',
  'non_registered',
  'other',
] as const

export type InvestmentType = (typeof INVESTMENT_TYPE_VALUES)[number]

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const NOTIFICATION_TYPE_VALUES = [
  'budget_caution',
  'budget_over',
  'settlement_reminder',
  'contribution_over',
  'contribution_room_refresh',
  'invitation_received',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPE_VALUES)[number]
