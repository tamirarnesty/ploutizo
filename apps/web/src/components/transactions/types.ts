/**
 * Flat superset of all 6 transaction type field shapes.
 *
 * Why flat (not discriminated union): TanStack Form name= prop requires keyof
 * to be statically known. A discriminated union would require runtime type narrowing
 * on every form.AppField call, which TanStack Form v1 does not support.
 *
 * All type-specific fields are optional. Server-side validation (createTransactionSchema)
 * enforces type-specific required fields after toApiPayload transforms the form values.
 */
export interface TransactionFormValues {
  // Shared base fields (preserved across type changes — D-07)
  type: 'expense' | 'income' | 'transfer' | 'settlement' | 'refund' | 'contribution'
  accountId: string
  amount: number         // dollars (form); API/DB stores cents — see toApiPayload
  date: string           // ISO date string 'YYYY-MM-DD'
  description: string
  merchant: string
  tagIds: string[]       // UUIDs of selected tags; names resolved via useGetTags for display

  // expense + refund (optional for refund)
  categoryId: string

  // refund
  refundOf: string       // UUID of the original transaction; empty string = none

  // income
  incomeType: string     // 'direct_deposit' | 'e_transfer' | 'cash' | 'cheque' | 'other'
  incomeSource: string

  // transfer
  toAccountId: string

  // settlement
  settledAccountId: string

  // contribution
  investmentType: string // 'tfsa' | 'rrsp' | 'fhsa' | 'resp' | 'non_registered' | 'other'

  // Split section
  assignees: AssigneeFormRow[]
}

/**
 * One row in the SplitSection assignee list.
 *
 * percentage is stored as a number here (not string).
 * When reading from a GET response, always parseFloat(row.percentage ?? '0')
 * before populating form state — Drizzle returns numeric columns as strings.
 */
export interface AssigneeFormRow {
  memberId: string
  amountCents: number
  percentage: number
}
