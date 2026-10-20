import { useAppForm } from '@ploutizo/ui/components/form';
import { createTransactionSchema } from '@ploutizo/validators';
import { normalizeTransactionAssignees } from '@ploutizo/utils/assignee-split';
import { formatGeneratedTransactionDescriptionFromAccounts } from '@ploutizo/utils/transaction-policy';
import { centsToDollars } from '@ploutizo/utils/currency';
import type { Account, OrgMember, TransactionRow } from '@ploutizo/validators';
import type {
  useCreateTransaction,
  useUpdateTransaction,
} from '@/lib/data-access/transactions';
import { resolveTransactionFormDescriptionLock } from '../getTransactionFormDescriptionLock';
import { splitAssigneesEvenly } from '../assigneeSplit';
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
      percentage: a.percentage ?? 0,
    }))
  );
};

export const buildDefaultValues = (
  transaction: TransactionRow | null,
  accounts: Account[] = [],
  orgMembers: readonly OrgMember[] = []
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
      // A household of one has nobody to choose between (D-17).
      assignees:
        orgMembers.length === 1
          ? splitAssigneesEvenly(0, [orgMembers[0].id])
          : [],
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

  const generatedCandidate = formatGeneratedTransactionDescriptionFromAccounts(
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
  // Align defaults with the locked template so DescriptionLockController does
  // not call handleChange on mount (which marks the form dirty). Preserve
  // custom/legacy descriptions that do not match the generated candidate.
  values.description = resolveTransactionFormDescriptionLock({
    type: values.type,
    refundOf: values.refundOf,
    currentDescription: transaction.description,
    generatedCandidate,
  }).description;

  return values;
};

interface UseTransactionFormOptions {
  transaction: TransactionRow | null;
  accounts: Account[];
  orgMembers?: readonly OrgMember[];
  onClose: () => void;
  /** Create mode only — called after a successful create (sheet close / reset handled by caller). */
  onCreateSuccess?: () => void;
  createMutation: CreateMutation;
  updateMutation: UpdateMutation;
}

export const useTransactionForm = ({
  transaction,
  accounts,
  orgMembers,
  onClose,
  onCreateSuccess,
  createMutation,
  updateMutation,
}: UseTransactionFormOptions) => {
  const isEditing = transaction !== null;

  const form = useAppForm({
    defaultValues: buildDefaultValues(transaction, accounts, orgMembers),
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
        onSuccess: () => {
          if (isEditing) {
            onClose();
          } else {
            onCreateSuccess?.();
          }
        },
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
