import { useAppForm } from '@ploutizo/ui/components/form';
import { createTransactionSchema } from '@ploutizo/validators';
import {
  formatSettlementDescription,
  normalizeTransactionAssignees,
} from '@ploutizo/utils';
import { parseCurrencyInput } from '@ploutizo/utils/currency';
import type { Account } from '@ploutizo/types';
import type {
  TransactionRow,
  useCreateTransaction,
  useUpdateTransaction,
} from '@/lib/data-access/transactions';
import type { TransactionFormValues } from '../types';

const LOCKED_DESCRIPTION_TYPES = [
  'transfer',
  'settlement',
  'contribution',
] as const;

export const isLockedDescriptionType = (
  type: string,
  refundOf: string
): boolean =>
  (LOCKED_DESCRIPTION_TYPES as readonly string[]).includes(type) ||
  (type === 'refund' && !!refundOf);

type LockedDescriptionInput = Pick<
  TransactionFormValues,
  'type' | 'accountId' | 'counterpartAccountId' | 'refundOf'
> & {
  accountName?: string | null;
  counterpartAccountName?: string | null;
};

/** Canonical auto-generated description for locked transaction types (D-11, D-12). */
export const computeLockedDescription = (
  values: LockedDescriptionInput,
  accounts: Account[],
  refundOriginalDesc?: string
): string => {
  const primaryAccount = accounts.find((a) => a.id === values.accountId);
  const counterpartAccount = accounts.find(
    (a) => a.id === values.counterpartAccountId
  );
  const primaryName = primaryAccount?.name ?? values.accountName ?? '…';
  const counterpartName =
    counterpartAccount?.name ?? values.counterpartAccountName ?? '…';

  switch (values.type) {
    case 'transfer':
      return `Transfer from ${primaryName} to ${counterpartName}`;
    case 'settlement': {
      const paidFromName = values.counterpartAccountId
        ? counterpartName
        : undefined;
      return formatSettlementDescription(primaryName, paidFromName);
    }
    case 'contribution':
      return `Contribution from ${primaryName} to ${counterpartName}`;
    case 'refund':
      return values.refundOf && refundOriginalDesc
        ? `Refund of ${refundOriginalDesc}`
        : '';
    default:
      return '';
  }
};

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
    amount: transaction.amount / 100,
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

  if (isLockedDescriptionType(values.type, values.refundOf)) {
    const locked = computeLockedDescription(
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

export const toApiPayload = (
  value: TransactionFormValues
): Record<string, unknown> => {
  // Always send `assignees` / `tagIds` as arrays (possibly empty). The API PATCH
  // path uses `undefined` to mean "leave existing rows unchanged"; `[]` means
  // replace-all with nothing (clear splits / tags). Sending `undefined` for an
  // empty form array made "remove all assignees/tags" a silent no-op.
  const base = {
    type: value.type,
    accountId: value.accountId,
    amount:
      value.amount === undefined || !Number.isFinite(value.amount)
        ? 0
        : parseCurrencyInput(String(value.amount)),
    date: value.date,
    description: value.description.trim(),
    notes: value.notes.trim() || undefined,
    tagIds: value.tagIds,
    assignees: value.assignees.map((a) => ({
      memberId: a.memberId,
      amountCents: a.amountCents,
      percentage: a.percentage,
    })),
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
