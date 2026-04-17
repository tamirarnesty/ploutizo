import { Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@ploutizo/ui/components/alert-dialog'
import { Button } from '@ploutizo/ui/components/button'
import { Input } from '@ploutizo/ui/components/input'
import { Spinner } from '@ploutizo/ui/components/spinner'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@ploutizo/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select'
import { Text } from '@ploutizo/ui/components/text'
import type { Account, OrgMember } from '@ploutizo/types'
import type { Category } from '@/lib/data-access/categories'
import {
  useGetTransaction,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from '@/lib/data-access/transactions'
import type { TransactionRow } from '@/lib/data-access/transactions'
import { useGetAccounts } from '@/lib/data-access/accounts'
import { useGetCategories } from '@/lib/data-access/categories'
import { useGetOrgMembers } from '@/lib/data-access/org'
import { useTransactionForm } from './hooks/useTransactionForm'
import { TransactionTypeFields } from './TransactionTypeFields'
import { TransactionTagPicker } from './TransactionTagPicker'
import { SplitSection } from './SplitSection'

interface TransactionFormProps {
  transaction: TransactionRow | null  // null = create mode
  onClose: () => void
}

interface TransactionFormInnerProps {
  transaction: TransactionRow | null
  accounts: Account[]
  categories: Category[]
  orgMembers: OrgMember[]
  onClose: () => void
}

/**
 * Outer component: fires all queries simultaneously (no waterfall — vercel-react-best-practices async-parallel).
 * Shows Spinner until all required data is resolved, then mounts the inner form.
 * Form mounts only with complete defaultValues — no useEffect/form.reset anti-pattern.
 */
export const TransactionForm = ({ transaction, onClose }: TransactionFormProps) => {
  const isEditing = transaction !== null

  // Fire ALL queries at top level simultaneously — no sequential waterfall
  const { data: txData, isLoading: txLoading } = useGetTransaction(
    isEditing ? transaction.id : null
  )
  const { data: accounts = [], isLoading: accountsLoading } = useGetAccounts()
  const { data: categories = [], isLoading: categoriesLoading } = useGetCategories()
  const { data: orgMembers = [], isLoading: membersLoading } = useGetOrgMembers()

  // Loading gate: render Spinner until ALL required data is ready
  const isLoading =
    accountsLoading ||
    categoriesLoading ||
    membersLoading ||
    (isEditing && txLoading)

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  // In edit mode, use fresh GET data if available (includes all joined fields);
  // fall back to the row data passed in (same shape).
  const resolvedTransaction = isEditing ? (txData ?? transaction) : null

  return (
    <TransactionFormInner
      key={resolvedTransaction?.id ?? 'new'}
      transaction={resolvedTransaction}
      accounts={accounts}
      categories={categories}
      orgMembers={orgMembers}
      onClose={onClose}
    />
  )
}

const TransactionFormInner = ({
  transaction,
  accounts,
  categories,
  orgMembers,
  onClose,
}: TransactionFormInnerProps) => {
  const isEditing = transaction !== null
  const createMutation = useCreateTransaction()
  const updateMutation = useUpdateTransaction(transaction?.id ?? '')
  const deleteMutation = useDeleteTransaction()

  const { form } = useTransactionForm({
    transaction,
    onClose,
    createMutation,
    updateMutation,
  })

  return (
    <form
      className="flex flex-1 flex-col overflow-hidden"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <FieldGroup>
          {/* TransactionTypeFields: type Select + listeners + conditional type-specific fields */}
          <TransactionTypeFields
            form={form}
            accounts={accounts}
            categories={categories}
            onAssigneesChange={(assignees) =>
              form.setFieldValue('assignees', assignees)
            }
          />

          {/* Base field: accountId */}
          <form.AppField
            name="accountId"
            validators={{
              onChange: ({ value }: { value: string }) =>
                !value ? 'Account is required.' : undefined,
            }}
          >
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                <FieldLabel htmlFor="tx-accountId">Account</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => { if (v !== null) field.handleChange(v) }}
                >
                  <SelectTrigger id="tx-accountId">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.state.meta.errors.length > 0 ? (
                  <FieldError>{String(field.state.meta.errors[0])}</FieldError>
                ) : null}
              </Field>
            )}
          </form.AppField>

          {/* Base field: amount */}
          <form.AppField
            name="amount"
            validators={{
              onChange: ({ value }: { value: number }) =>
                value <= 0 ? 'Amount must be greater than zero.' : undefined,
            }}
          >
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                <FieldLabel htmlFor="tx-amount">Amount</FieldLabel>
                <Input
                  id="tx-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  autoComplete="off"
                  value={field.state.value}
                  onChange={(e) =>
                    field.handleChange(parseFloat(e.target.value) || 0)
                  }
                  onBlur={field.handleBlur}
                />
                {field.state.meta.errors.length > 0 ? (
                  <FieldError>{String(field.state.meta.errors[0])}</FieldError>
                ) : null}
              </Field>
            )}
          </form.AppField>

          {/* Base field: date */}
          <form.AppField
            name="date"
            validators={{
              onChange: ({ value }: { value: string }) =>
                !value ? 'Date is required.' : undefined,
            }}
          >
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                <FieldLabel htmlFor="tx-date">Date</FieldLabel>
                <Input
                  id="tx-date"
                  type="date"
                  autoComplete="off"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {field.state.meta.errors.length > 0 ? (
                  <FieldError>{String(field.state.meta.errors[0])}</FieldError>
                ) : null}
              </Field>
            )}
          </form.AppField>

          {/* Base field: description */}
          <form.AppField name="description">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="tx-description">
                  Description{' '}
                  <Text as="span" variant="body-sm" className="font-normal text-muted-foreground">
                    (optional)
                  </Text>
                </FieldLabel>
                <Input
                  id="tx-description"
                  autoComplete="off"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {/* TODO(03.4-deferred): originalDescription column — add when schema patch lands */}
                {/* D-19: import caption (└ Original: ...) is deferred because originalDescription */}
                {/* and originalMerchant columns are absent from the current DB schema. */}
              </Field>
            )}
          </form.AppField>

          {/* Base field: merchant */}
          <form.AppField name="merchant">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="tx-merchant">
                  Merchant{' '}
                  <Text as="span" variant="body-sm" className="font-normal text-muted-foreground">
                    (optional)
                  </Text>
                </FieldLabel>
                <Input
                  id="tx-merchant"
                  autoComplete="off"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </Field>
            )}
          </form.AppField>

          {/* Tag picker — after merchant, before assignees (D-07: tags is a shared base field) */}
          <form.AppField name="tagIds">
            {(field) => (
              <Field>
                <FieldLabel>
                  Tags{' '}
                  <Text as="span" variant="body-sm" className="font-normal text-muted-foreground">
                    (optional)
                  </Text>
                </FieldLabel>
                <TransactionTagPicker
                  value={field.state.value}
                  onChange={(tagIds) => field.handleChange(tagIds)}
                />
              </Field>
            )}
          </form.AppField>

          {/* SplitSection — always visible (D-09) */}
          {/* form.Subscribe wraps AppField so amountCents is reactive on amount change */}
          <form.Subscribe selector={(s) => s.values.amount}>
            {(amount) => (
              <form.AppField name="assignees">
                {(field) => (
                  <SplitSection
                    value={field.state.value}
                    onChange={(assignees) => field.handleChange(assignees)}
                    amountCents={Math.round((amount ?? 0) * 100)}
                    orgMembers={orgMembers}
                  />
                )}
              </form.AppField>
            )}
          </form.Subscribe>

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

      {/* Footer — matches AccountForm layout exactly */}
      <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-4">
        {isEditing ? (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  type="button"
                  className="text-destructive hover:text-destructive"
                />
              }
            >
              <Trash2 size={16} className="mr-1" aria-hidden="true" />
              Delete transaction
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove this transaction. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    if (!transaction) return
                    deleteMutation.mutate(transaction.id, { onSuccess: onClose })
                  }}
                >
                  Delete transaction
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Discard changes
          </Button>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner className="mr-1" /> : null}
                {isEditing ? 'Save changes' : 'Add transaction'}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </div>
    </form>
  )
}
