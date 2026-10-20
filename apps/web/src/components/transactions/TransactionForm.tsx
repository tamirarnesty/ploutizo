import { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Spinner } from '@ploutizo/ui/components/spinner';
import { FieldGroup } from '@ploutizo/ui/components/field';
import { Text } from '@ploutizo/ui/components/text';
import { SheetFooter } from '@ploutizo/ui/components/sheet';
import { Button } from '@ploutizo/ui/components/button';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import { toast } from '@ploutizo/ui/components/sonner-api';
import { useIsMobile } from '@ploutizo/ui/hooks/use-mobile';
import { cn } from '@ploutizo/ui/lib/utils';
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
  useDeleteTransaction,
  useGetTransaction,
  useUpdateTransaction,
} from '@/lib/data-access/transactions';
import {
  PendingInputFlushProvider,
  useFlushPendingInputs,
} from '@/lib/money/pending-input-flush';
import { useTransactionDescriptionLock } from './hooks/useTransactionDescriptionLock';
import {
  buildDefaultValues,
  useTransactionForm,
} from './hooks/useTransactionForm';
import { TransactionAccountSlots } from './TransactionAccountSlots';
import { TransactionAmountField } from './TransactionAmountField';
import { TransactionAssigneesField } from './TransactionAssigneesField';
import { TransactionDateField } from './TransactionDateField';
import { TransactionDescriptionField } from './TransactionDescriptionField';
import { DeleteTransactionDialog } from './DeleteTransactionDialog';
import { TransactionNotesTagsFields } from './TransactionNotesTagsFields';
import { TransactionTypeFields } from './TransactionTypeFields';
import { TransactionCreateFooter } from './TransactionCreateFooter';
import type { TransactionCreateMode } from './TransactionCreateFooter';

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
  const isEditing = transaction !== null;
  const isMobile = useIsMobile();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction(transaction?.id ?? '');
  const deleteMutation = useDeleteTransaction();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [createMode, setCreateMode] = useState<TransactionCreateMode>('add');
  const [showAdded, setShowAdded] = useState(false);
  const createModeRef = useRef(createMode);
  useEffect(() => {
    createModeRef.current = createMode;
  }, [createMode]);
  const addedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushPendingInputs = useFlushPendingInputs();

  const resetFormRef = useRef<(() => void) | null>(null);

  const handleCreateSuccess = useCallback(() => {
    setShowAdded(true);
    if (addedTimeoutRef.current) {
      clearTimeout(addedTimeoutRef.current);
    }
    addedTimeoutRef.current = setTimeout(() => {
      setShowAdded(false);
      if (createModeRef.current === 'add') {
        onClose();
      } else {
        resetFormRef.current?.();
      }
      addedTimeoutRef.current = null;
    }, 1200);
  }, [onClose]);

  const { form } = useTransactionForm({
    transaction,
    accounts,
    orgMembers,
    onClose,
    onCreateSuccess: isEditing ? undefined : handleCreateSuccess,
    createMutation,
    updateMutation,
  });

  useEffect(() => {
    resetFormRef.current = () => {
      form.reset(buildDefaultValues(null, accounts, orgMembers));
    };
  }, [form, accounts, orgMembers]);

  useEffect(() => {
    return () => {
      if (addedTimeoutRef.current) {
        clearTimeout(addedTimeoutRef.current);
      }
    };
  }, []);
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

      <SheetFooter
        className={cn(
          'flex-row items-center justify-between gap-2 border-t border-border px-6',
          isMobile &&
            'sticky bottom-0 z-10 shrink-0 bg-popover pb-[max(1rem,env(safe-area-inset-bottom))]'
        )}
      >
        {transaction ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label="Delete transaction"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 size={16} aria-hidden="true" />
            </Button>
            <DeleteTransactionDialog
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              isPending={deleteMutation.isPending}
              onConfirm={() => {
                deleteMutation.mutate(transaction.id, {
                  onSuccess: () => {
                    onClose();
                    toast.success('Transaction deleted.');
                  },
                  onError: () => {
                    toast.error('Failed to delete transaction.');
                  },
                });
              }}
            />
          </>
        ) : (
          <div />
        )}
        <div className={cn('flex gap-2', !transaction && isMobile && 'w-full')}>
          {transaction ? (
            <LoadingButton
              type="submit"
              loading={updateMutation.isPending}
              loadingText="Saving…"
            >
              Save changes
            </LoadingButton>
          ) : (
            <TransactionCreateFooter
              mode={createMode}
              onModeChange={setCreateMode}
              isPending={createMutation.isPending}
              showAdded={showAdded}
            />
          )}
        </div>
      </SheetFooter>
    </form>
  );
};
