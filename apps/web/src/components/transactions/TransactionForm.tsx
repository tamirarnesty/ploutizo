import { useEffect } from 'react';
import { Spinner } from '@ploutizo/ui/components/spinner';
import { FieldGroup } from '@ploutizo/ui/components/field';
import { Text } from '@ploutizo/ui/components/text';
import type {
  Account,
  Category,
  OrgMember,
  TransactionRow,
} from '@ploutizo/validators';
import { useGetHouseholdMembers } from '@/lib/data-access/household';
import { useGetCategories } from '@/lib/data-access/categories';
import { useGetAccounts } from '@/lib/data-access/accounts';
import {
  useCreateTransaction,
  useGetTransaction,
  useUpdateTransaction,
} from '@/lib/data-access/transactions';
import {
  PendingInputFlushProvider,
  useFlushPendingInputs,
} from '@/lib/money/pending-input-flush';
import { useTransactionDescriptionLock } from './hooks/useTransactionDescriptionLock';
import { useTransactionForm } from './hooks/useTransactionForm';
import { TransactionAccountSlots } from './TransactionAccountSlots';
import { TransactionAmountField } from './TransactionAmountField';
import { TransactionAssigneesField } from './TransactionAssigneesField';
import { TransactionDateField } from './TransactionDateField';
import { TransactionDescriptionField } from './TransactionDescriptionField';
import { TransactionFormFooter } from './TransactionFormFooter';
import { TransactionNotesTagsFields } from './TransactionNotesTagsFields';
import { TransactionTypeFields } from './TransactionTypeFields';

interface TransactionFormProps {
  transaction: TransactionRow | null; // null = create mode
  onClose: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

interface TransactionFormInnerProps {
  transaction: TransactionRow | null;
  accounts: Account[];
  categories: Category[];
  orgMembers: OrgMember[];
  onClose: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * Outer component: fires all queries simultaneously (no waterfall — vercel-react-best-practices async-parallel).
 * Shows Spinner until all required data is resolved, then mounts the inner form.
 * Form mounts only with complete defaultValues — no useEffect/form.reset anti-pattern.
 */
export const TransactionForm = ({
  transaction,
  onClose,
  onDirtyChange,
}: TransactionFormProps) => {
  const isEditing = transaction !== null;

  // Fire ALL queries at top level simultaneously — no sequential waterfall
  const { data: txData, isLoading: txLoading } = useGetTransaction(
    isEditing ? transaction.id : null,
    { initialData: transaction ?? undefined }
  );
  const { data: accounts = [], isLoading: accountsLoading } =
    useGetAccounts(true);
  const { data: categories = [], isLoading: categoriesLoading } =
    useGetCategories();
  const { data: orgMembers = [], isLoading: membersLoading } =
    useGetHouseholdMembers();

  // Loading gate: render Spinner until ALL required data is ready
  const isLoading =
    accountsLoading ||
    categoriesLoading ||
    membersLoading ||
    (isEditing && txLoading);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // In edit mode, use fresh GET data if available (includes all joined fields);
  // fall back to the row data passed in (same shape).
  const resolvedTransaction = isEditing ? (txData ?? transaction) : null;

  return (
    <PendingInputFlushProvider>
      <TransactionFormInner
        key={resolvedTransaction?.id ?? 'new'}
        transaction={resolvedTransaction}
        accounts={accounts}
        categories={categories}
        orgMembers={orgMembers}
        onClose={onClose}
        onDirtyChange={onDirtyChange}
      />
    </PendingInputFlushProvider>
  );
};

const DirtyNotifier = ({
  isDirty,
  onChange,
}: {
  isDirty: boolean;
  onChange: (d: boolean) => void;
}) => {
  useEffect(() => {
    onChange(isDirty);
  }, [isDirty, onChange]);
  return (
    <span
      data-testid="transaction-form-unsaved"
      data-unsaved={isDirty ? 'true' : 'false'}
      hidden
    />
  );
};

const TransactionFormInner = ({
  transaction,
  accounts,
  categories,
  orgMembers,
  onClose,
  onDirtyChange,
}: TransactionFormInnerProps) => {
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction(transaction?.id ?? '');
  const flushPendingInputs = useFlushPendingInputs();

  const { form } = useTransactionForm({
    transaction,
    accounts,
    orgMembers,
    onClose,
    createMutation,
    updateMutation,
  });
  const { isLocked, lockedValue, unlockDescription } =
    useTransactionDescriptionLock({ form, accounts, transaction });

  return (
    <form
      className="flex flex-1 flex-col overflow-hidden"
      data-testid="transaction-form"
      action={() => {
        flushPendingInputs();
        void form.handleSubmit();
      }}
    >
      {/* Compare to default values, not isDirty — programmatic sync (e.g. locked
          description) can set isDirty while values still match defaults. */}
      {onDirtyChange ? (
        <form.Subscribe selector={(s) => !s.isDefaultValue}>
          {(hasUnsavedChanges) => (
            <DirtyNotifier
              isDirty={hasUnsavedChanges}
              onChange={onDirtyChange}
            />
          )}
        </form.Subscribe>
      ) : null}

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <FieldGroup>
          <TransactionTypeFields
            form={form}
            accounts={accounts}
            categories={categories}
          />

          {/* account slots — labels, options, and same-account exclusion from policy */}
          <TransactionAccountSlots form={form} accounts={accounts} />

          <div className="grid grid-cols-2 gap-4">
            <TransactionAmountField form={form} />
            <form.Subscribe
              selector={(s) => ({
                accountId: s.values.accountId,
                counterpartAccountId: s.values.counterpartAccountId,
              })}
            >
              {({ accountId, counterpartAccountId }) => (
                <TransactionDateField
                  form={form}
                  accounts={accounts}
                  accountId={accountId}
                  counterpartAccountId={counterpartAccountId}
                />
              )}
            </form.Subscribe>
          </div>

          <TransactionDescriptionField
            form={form}
            isLocked={isLocked}
            lockedValue={lockedValue}
            onUnlock={unlockDescription}
          />

          <TransactionNotesTagsFields form={form} />

          <TransactionAssigneesField
            form={form}
            orgMembers={orgMembers}
            transaction={transaction}
          />

          {/* Form-level mutation error */}
          <form.Subscribe selector={(s) => s.errorMap.onSubmit}>
            {(submitError) =>
              submitError ? (
                <Text variant="error">{String(submitError)}</Text>
              ) : null
            }
          </form.Subscribe>
        </FieldGroup>
      </div>

      <TransactionFormFooter
        form={form}
        transaction={transaction}
        onClose={onClose}
      />
    </form>
  );
};
