import { useAppForm } from '@ploutizo/ui/components/form';
import { createTransactionSchema } from '@ploutizo/validators';
import { normalizeTransactionAssignees } from '@ploutizo/utils/assignee-split';
import {
  formatGeneratedTransactionDescriptionFromAccounts,
  resolveTransactionDescriptionPolicy,
} from '@ploutizo/utils/transaction-policy';
import { centsToDollars } from '@ploutizo/utils/currency';
import type { Account } from '@ploutizo/types';
import type {
  TransactionRow,
  useCreateTransaction,
  useUpdateTransaction,
} from '@/lib/data-access/transactions';
import { toTransactionApiPayload } from '../toTransactionApiPayload';
import type { TransactionFormValues } from '../types';

export { toTransactionApiPayload as toApiPayload } from '../toTransactionApiPayload';

export type CreateMutation = ReturnType<typeof useCreateTransaction>;
export type UpdateMutation = ReturnType<typeof useUpdateTransaction>;

/** Test/dev helper: field keys whose values differ from form defaults. */
const buildAssigneeDefaults = (
  transaction: TransactionRow
): TransactionFormValues['assignees'] => {
  if (transaction.assignees.length === 0) return [];

  return normalizeTransactionAssignees(
    Math.abs(transaction.amount),
    transaction.assignees.map((a) => ({
      memberId: a.memberId,
      amountCents: a.amountCents,
      percentage: a.percentage !== null ? parseFloat(a.percentage) : 0,
    }))
  );
};

export const buildDefaultValues = (
  transaction: TransactionRow | null,
  accounts: Account[] = []
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

  const values: TransactionFormValues = {
    type: transaction.type,
    accountId: transaction.accountId,
    amount: centsToDollars(transaction.amount),
    date: transaction.date,
    description: transaction.description,
    tagIds: transaction.tags.map((t) => t.id),
    categoryId: transaction.categoryId ?? '',
    refundOf: transaction.refundOf ?? '',
    incomeType: transaction.incomeType ?? '',
    counterpartAccountId: transaction.counterpartAccountId ?? '',
    notes: transaction.notes ?? '',
    assignees: buildAssigneeDefaults(transaction),
  };

  if (
    resolveTransactionDescriptionPolicy({
      type: values.type,
      refundOf: values.refundOf,
    }).mode === 'generated'
  ) {
    const locked = formatGeneratedTransactionDescriptionFromAccounts(
      {
        type: values.type,
        accountId: values.accountId,
        counterpartAccountId: values.counterpartAccountId,
        refundOf: values.refundOf,
        accountName: transaction.accountName,
        counterpartAccountName: transaction.counterpartAccountName,
      },
      accounts
    );
    const stored = transaction.description.trim();
    // Align defaults with the locked template so DescriptionSyncer does not
    // call handleChange on mount (which marks the form dirty). Preserve custom
    // descriptions the user saved after unlocking the field.
    if (locked && (!stored || stored === locked)) {
      values.description = locked;
    }
  }

  return values;
};

interface UseTransactionFormOptions {
  transaction: TransactionRow | null;
  accounts: Account[];
  onClose: () => void;
  createMutation: CreateMutation;
  updateMutation: UpdateMutation;
}

export const useTransactionForm = ({
  transaction,
  accounts,
  onClose,
  createMutation,
  updateMutation,
}: UseTransactionFormOptions) => {
  const isEditing = transaction !== null;

  const form = useAppForm({
    defaultValues: buildDefaultValues(transaction, accounts),
    validators: {
      onSubmit: ({ value }: { value: TransactionFormValues }) => {
        const payload = toTransactionApiPayload(value);
        const result = createTransactionSchema.safeParse(payload);
        if (!result.success) {
          return result.error.issues.map((i) => i.message).join(', ');
        }
      },
    },
    onSubmit: ({ value }: { value: TransactionFormValues }) => {
      const payload = toTransactionApiPayload(value);
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
