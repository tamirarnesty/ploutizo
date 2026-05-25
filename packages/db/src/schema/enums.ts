/**
 * Postgres enums — values from `@ploutizo/types` `*_VALUES` tuples.
 */

import {
  ACCOUNT_TYPE_VALUES,
  BUDGET_PERIOD_TYPE_VALUES,
  INCOME_TYPE_VALUES,
  INVESTMENT_TYPE_VALUES,
  MEMBER_ROLE_VALUES,
  MERCHANT_MATCH_TYPE_VALUES,
  NOTIFICATION_TYPE_VALUES,
  RECURRING_FREQUENCY_VALUES,
  RECURRING_STATUS_VALUES,
  TRANSACTION_TYPE_VALUES,
} from '@ploutizo/types'
import { pgEnum } from 'drizzle-orm/pg-core'

export const memberRoleEnum = pgEnum('member_role', [...MEMBER_ROLE_VALUES])

export const transactionTypeEnum = pgEnum('transaction_type', [
  ...TRANSACTION_TYPE_VALUES,
])

export const incomeTypeEnum = pgEnum('income_type', [...INCOME_TYPE_VALUES])

export const accountTypeEnum = pgEnum('account_type', [...ACCOUNT_TYPE_VALUES])

export const recurringFrequencyEnum = pgEnum('recurring_frequency', [
  ...RECURRING_FREQUENCY_VALUES,
])

export const recurringStatusEnum = pgEnum('recurring_status', [
  ...RECURRING_STATUS_VALUES,
])

export const merchantMatchTypeEnum = pgEnum('merchant_match_type', [
  ...MERCHANT_MATCH_TYPE_VALUES,
])

export const budgetPeriodTypeEnum = pgEnum('budget_period_type', [
  ...BUDGET_PERIOD_TYPE_VALUES,
])

export const investmentTypeEnum = pgEnum('investment_type', [
  ...INVESTMENT_TYPE_VALUES,
])

export const notificationTypeEnum = pgEnum('notification_type', [
  ...NOTIFICATION_TYPE_VALUES,
])
