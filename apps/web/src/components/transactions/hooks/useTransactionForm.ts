import { useAppForm } from '@ploutizo/ui/components/form'
import { createTransactionSchema } from '@ploutizo/validators'
import type { TransactionFormValues } from '../types'
import type { TransactionRow } from '@/lib/data-access/transactions'
import {
  useCreateTransaction,
  useUpdateTransaction,
} from '@/lib/data-access/transactions'

/**
 * Converts a TransactionRow (API/DB shape) into TransactionFormValues (form shape).
 *
 * Key conversions:
 * - amount: API stores cents → form stores dollars (divide by 100)
 * - tagIds: extract UUIDs from TransactionTag[] objects
 * - assignee.percentage: Drizzle numeric columns return strings → parseFloat
 */
export function buildDefaultValues(
  transaction: TransactionRow | null
): TransactionFormValues {
  if (transaction === null) {
    return {
      type: 'expense',
      accountId: '',
      amount: 0,
      date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      description: '',
      merchant: '',
      tagIds: [],
      categoryId: '',
      refundOf: '',
      incomeType: '',
      incomeSource: '',
      toAccountId: '',
      settledAccountId: '',
      investmentType: '',
      assignees: [],
    }
  }

  return {
    type: transaction.type,
    accountId: transaction.accountId,
    amount: transaction.amount / 100, // API stores cents; form stores dollars
    date: transaction.date,
    description: transaction.description ?? '',
    merchant: transaction.merchant ?? '',
    // TransactionRow.tags is TransactionTag[] — extract IDs only
    tagIds: transaction.tags.map((t) => t.id),
    categoryId: transaction.categoryId ?? '',
    refundOf: transaction.refundOf ?? '',
    incomeType: transaction.incomeType ?? '',
    incomeSource: transaction.incomeSource ?? '',
    toAccountId: transaction.toAccountId ?? '',
    settledAccountId: transaction.settledAccountId ?? '',
    investmentType: transaction.investmentType ?? '',
    assignees: transaction.assignees.map((a) => ({
      memberId: a.memberId,
      amountCents: a.amountCents,
      // Drizzle numeric column returns string — always parseFloat before use
      percentage: a.percentage !== null ? parseFloat(a.percentage) : 0,
    })),
  }
}

/**
 * Transforms form values into the createTransactionSchema-compatible API body.
 *
 * Key conversions:
 * - amount: dollars → cents via Math.round (T-03.4-08: prevents floating-point drift)
 * - tagIds: included in base payload for all types
 * - type-specific fields: only include relevant ones per type
 */
export function toApiPayload(
  value: TransactionFormValues
): Record<string, unknown> {
  const base = {
    type: value.type,
    accountId: value.accountId,
    amount: Math.round(value.amount * 100), // dollars → cents (integer)
    date: value.date,
    description: value.description.trim() || undefined,
    merchant: value.merchant.trim() || undefined,
    tagIds: value.tagIds.length > 0 ? value.tagIds : undefined,
    assignees:
      value.assignees.length > 0
        ? value.assignees.map((a) => ({
            memberId: a.memberId,
            amountCents: a.amountCents,
            percentage: a.percentage,
          }))
        : undefined,
  }

  // Type-specific fields — only include relevant ones per type
  switch (value.type) {
    case 'expense':
      return { ...base, categoryId: value.categoryId || undefined }
    case 'refund':
      return {
        ...base,
        categoryId: value.categoryId || undefined,
        refundOf: value.refundOf || undefined,
      }
    case 'income':
      return {
        ...base,
        incomeType: value.incomeType || undefined,
        incomeSource: value.incomeSource.trim() || undefined,
      }
    case 'transfer':
      return { ...base, toAccountId: value.toAccountId || undefined }
    case 'settlement':
      return { ...base, settledAccountId: value.settledAccountId || undefined }
    case 'contribution':
      return { ...base, investmentType: value.investmentType || undefined }
    default:
      return base
  }
}

interface UseTransactionFormOptions {
  transaction: TransactionRow | null
  onClose: () => void
  createMutation: ReturnType<typeof useCreateTransaction>
  updateMutation: ReturnType<typeof useUpdateTransaction>
}

export function useTransactionForm({
  transaction,
  onClose,
  createMutation,
  updateMutation,
}: UseTransactionFormOptions) {
  const isEditing = transaction !== null

  const form = useAppForm({
    defaultValues: buildDefaultValues(transaction),
    validators: {
      onSubmit: ({ value }: { value: TransactionFormValues }) => {
        const payload = toApiPayload(value)
        const result = createTransactionSchema.safeParse(payload)
        if (!result.success) {
          return result.error.issues.map((i) => i.message).join(', ')
        }
      },
    },
    onSubmit: ({ value }: { value: TransactionFormValues }) => {
      const payload = toApiPayload(value)
      const mutation = isEditing ? updateMutation : createMutation
      mutation.mutate(payload, {
        onSuccess: onClose,
        onError: () =>
          form.setErrorMap({
            onSubmit: "Couldn't save changes. Check your connection and try again.",
          }),
      })
    },
  })

  return { form, isEditing }
}
