/**
 * packages/db/schema/enums.ts
 *
 * Postgres enums shared across multiple domain schema files.
 * Enums used only within a single domain file are defined there instead.
 */

import { pgEnum } from 'drizzle-orm/pg-core'

// ---------------------------------------------------------------------------
// Shared across auth + other domains
// ---------------------------------------------------------------------------

export const memberRoleEnum = pgEnum('member_role', [
  'admin', // All members are admin in v1 — field reserved for future use
])

// ---------------------------------------------------------------------------
// Shared across transactions + recurring
// ---------------------------------------------------------------------------

export const transactionTypeEnum = pgEnum('transaction_type', [
  'expense',
  'refund',
  'income',
  'transfer',
  'settlement',
  'contribution',
])

// ---------------------------------------------------------------------------
// Transactions only
// ---------------------------------------------------------------------------

export const incomeTypeEnum = pgEnum('income_type', [
  'direct_deposit',
  'e_transfer',
  'cash',
  'cheque',
  'other',
])

// ---------------------------------------------------------------------------
// Accounts only
// ---------------------------------------------------------------------------

export const accountTypeEnum = pgEnum('account_type', [
  'chequing',
  'savings',
  'credit_card',
  'prepaid_cash',
  'e_transfer',
  'investment',
  'other',
])

// ---------------------------------------------------------------------------
// Recurring only
// ---------------------------------------------------------------------------

export const recurringFrequencyEnum = pgEnum('recurring_frequency', [
  'daily',
  'weekly',
  'bi_weekly',
  'monthly',
  'yearly',
])

export const recurringStatusEnum = pgEnum('recurring_status', [
  'active',
  'stopped',
])

// ---------------------------------------------------------------------------
// Classification only
// ---------------------------------------------------------------------------

export const merchantMatchTypeEnum = pgEnum('merchant_match_type', [
  'exact',
  'contains',
  'starts_with',
  'ends_with',
  'regex',
])

// ---------------------------------------------------------------------------
// Budgets only
// ---------------------------------------------------------------------------

export const budgetPeriodTypeEnum = pgEnum('budget_period_type', [
  'monthly',
  'weekly',
  'bi_weekly',
  'yearly',
  'custom',
])

// ---------------------------------------------------------------------------
// Investments only
// ---------------------------------------------------------------------------

export const investmentTypeEnum = pgEnum('investment_type', [
  'tfsa',
  'rrsp',
  'fhsa',
  'resp',
  'non_registered',
  'other',
])

// ---------------------------------------------------------------------------
// Notifications only
// ---------------------------------------------------------------------------

export const notificationTypeEnum = pgEnum('notification_type', [
  'budget_caution',
  'budget_over',
  'settlement_reminder',
  'contribution_over',
  'contribution_room_refresh',
  'invitation_received',
])
