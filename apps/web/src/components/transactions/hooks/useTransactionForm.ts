import { useAppForm } from '@ploutizo/ui/components/form';
import { createTransactionSchema } from '@ploutizo/validators';
import type {
  TransactionRow,
  useCreateTransaction,
  useUpdateTransaction,
} from '@/lib/data-access/transactions';
import type { TransactionFormValues } from '../types';

export type CreateMutation = ReturnType<typeof useCreateTransaction>;
export type UpdateMutation = ReturnType<typeof useUpdateTransaction>;

export const buildDefaultValues = (
  transaction: TransactionRow | null
): TransactionFormValues => {
  if (transaction === null) {
    return {
      type: 'expense',
      accountId: '',
      amount: undefined,
      date: (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })(),
      description: '',
      tagIds: [],
      categoryId: '',
      refundOf: '',
      incomeType: '',
      counterpartAccountId: '',
      notes: '',
      assignees: [],
    };
  }

  return {
    type: transaction.type,
    accountId: transaction.accountId,
    amount: transaction.amount / 100,
    date: transaction.date,
    description: transaction.description,
    tagIds: transaction.tags.map((t) => t.id),
    categoryId: transaction.categoryId ?? '',
    refundOf: transaction.refundOf ?? '',
    incomeType: transaction.incomeType ?? '',
    counterpartAccountId: transaction.counterpartAccountId ?? '',
    notes: transaction.notes ?? '',
    assignees: transaction.assignees.map((a) => ({
      memberId: a.memberId,
      amountCents: a.amountCents,
      // Drizzle numeric column returns string — always parseFloat before use
      percentage: a.percentage !== null ? parseFloat(a.percentage) : 0,
    })),
  };
};

export const toApiPayload = (
  value: TransactionFormValues
): Record<string, unknown> => {
  const base = {
    type: value.type,
    accountId: value.accountId,
    amount: Math.round((value.amount ?? 0) * 100),
    date: value.date,
    description: value.description.trim(),
    notes: value.notes.trim() || undefined,
    tagIds: value.tagIds.length > 0 ? value.tagIds : undefined,
    assignees:
      value.assignees.length > 0
        ? value.assignees.map((a) => ({
            memberId: a.memberId,
            amountCents: a.amountCents,
            percentage: a.percentage,
          }))
        : undefined,
  };

  switch (value.type) {
    case 'expense':
      return { ...base, categoryId: value.categoryId || undefined };
    case 'refund':
      return {
        ...base,
        categoryId: value.categoryId || undefined,
        refundOf: value.refundOf || undefined,
      };
    case 'income':
      return {
        ...base,
        incomeType: value.incomeType || undefined,
      };
    case 'transfer':
      return {
        ...base,
        counterpartAccountId: value.counterpartAccountId || undefined,
      };
    case 'settlement':
      return {
        ...base,
        counterpartAccountId: value.counterpartAccountId || undefined,
      };
    case 'contribution':
      return {
        ...base,
        counterpartAccountId: value.counterpartAccountId || undefined,
      };
    default:
      return base;
  }
};

interface UseTransactionFormOptions {
  transaction: TransactionRow | null;
  onClose: () => void;
  createMutation: CreateMutation;
  updateMutation: UpdateMutation;
}

export const useTransactionForm = ({
  transaction,
  onClose,
  createMutation,
  updateMutation,
}: UseTransactionFormOptions) => {
  const isEditing = transaction !== null;

  const form = useAppForm({
    defaultValues: buildDefaultValues(transaction),
    validators: {
      onSubmit: ({ value }: { value: TransactionFormValues }) => {
        const payload = toApiPayload(value);
        const result = createTransactionSchema.safeParse(payload);
        if (!result.success) {
          return result.error.issues.map((i) => i.message).join(', ');
        }
      },
    },
    onSubmit: ({ value }: { value: TransactionFormValues }) => {
      const payload = toApiPayload(value);
      const mutation = isEditing ? updateMutation : createMutation;
      mutation.mutate(payload, {
        onSuccess: onClose,
        onError: () =>
          form.setErrorMap({
            onSubmit:
              "Couldn't save changes. Check your connection and try again.",
          }),
      });
    },
  });

  return { form, isEditing };
};

export type TransactionFormInstance = ReturnType<
  typeof useTransactionForm
>['form'];
