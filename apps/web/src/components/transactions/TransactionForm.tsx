import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarIcon, Trash2 } from 'lucide-react'
import { toast } from '@ploutizo/ui/components/sonner'
import { Button } from '@ploutizo/ui/components/button'
import { Calendar } from '@ploutizo/ui/components/calendar'
import { Input } from '@ploutizo/ui/components/input'
import { Popover, PopoverContent, PopoverTrigger } from '@ploutizo/ui/components/popover'
import { Spinner } from '@ploutizo/ui/components/spinner'
import { cn } from '@ploutizo/ui/lib/utils'
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
import { DeleteTransactionDialog } from './DeleteTransactionDialog'
import { useTransactionForm } from './hooks/useTransactionForm'
import { FormattedAmountInput } from './FormattedAmountInput'
import { TransactionTypeFields } from './TransactionTypeFields'
import { TransactionTagPicker } from './TransactionTagPicker'
import { SplitSection } from './SplitSection'
import type { TransactionRow } from '@/lib/data-access/transactions'
import type { Account, OrgMember } from '@ploutizo/types'
import type { Category } from '@/lib/data-access/categories'
import { useGetOrgMembers } from '@/lib/data-access/org'
import { useGetCategories } from '@/lib/data-access/categories'
import { useGetAccounts } from '@/lib/data-access/accounts'
import {
  useCreateTransaction,
  useDeleteTransaction,
  useGetTransaction,
  useUpdateTransaction,
} from '@/lib/data-access/transactions'

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
    isEditing ? transaction.id : null,
    { initialData: transaction ?? undefined }
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

  const [dateOpen, setDateOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)

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
                    <SelectValue>
                      {accounts.find((a) => a.id === field.state.value)?.name ?? 'Select account'}
                    </SelectValue>
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
              onChange: ({ value }: { value: number | undefined }) =>
                !value || value <= 0 ? 'Amount must be greater than zero.' : undefined,
            }}
          >
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                <FieldLabel htmlFor="tx-amount">Amount</FieldLabel>
                <FormattedAmountInput
                  value={field.state.value}
                  onChange={(v) => field.handleChange(v)}
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
                <FieldLabel>Date</FieldLabel>
                {(() => {
                  const selectedDate = field.state.value ? parseISO(field.state.value) : undefined
                  return (
                    <Popover open={dateOpen} onOpenChange={setDateOpen}>
                      <PopoverTrigger
                        render={
                          <Button
                            variant="outline"
                            type="button"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !field.state.value && 'text-muted-foreground',
                            )}
                          />
                        }
                      >
                        <CalendarIcon className="mr-2 size-4" aria-hidden="true" />
                        {field.state.value
                          ? format(selectedDate!, 'MMM d, yyyy')
                          : 'Pick a date'}
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            field.handleChange(date ? format(date, 'yyyy-MM-dd') : '')
                            setDateOpen(false)
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )
                })()}
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
          <>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label="Delete transaction"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setAlertOpen(true)}
            >
              <Trash2 size={16} aria-hidden="true" />
            </Button>
            <DeleteTransactionDialog
              open={alertOpen}
              onOpenChange={setAlertOpen}
              isPending={deleteMutation.isPending}
              onConfirm={() => {
                if (!transaction) return
                deleteMutation.mutate(transaction.id, {
                  onSuccess: () => {
                    onClose()
                    toast.success('Transaction deleted.')
                  },
                  onError: () => {
                    toast.error('Failed to delete transaction.')
                  },
                })
              }}
            />
          </>
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
