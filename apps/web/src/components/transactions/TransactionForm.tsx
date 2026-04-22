import { useEffect, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarIcon, Lock, SquarePen, Trash2 } from 'lucide-react'
import { toast } from '@ploutizo/ui/components/sonner'
import { Button } from '@ploutizo/ui/components/button'
import { Calendar } from '@ploutizo/ui/components/calendar'
import { Input } from '@ploutizo/ui/components/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@ploutizo/ui/components/input-group'
import { Popover, PopoverContent, PopoverTrigger } from '@ploutizo/ui/components/popover'
import { Spinner } from '@ploutizo/ui/components/spinner'
import { Textarea } from '@ploutizo/ui/components/textarea'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip'
import { DeleteTransactionDialog } from './DeleteTransactionDialog'
import { useTransactionForm } from './hooks/useTransactionForm'
import { FormattedAmountInput } from './FormattedAmountInput'
import { TransactionTypeFields } from './TransactionTypeFields'
import { TransactionTagPicker } from './TransactionTagPicker'
import { AssigneeSection } from './AssigneeSection'
import type { AssigneeFormRow } from './types'
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
  onDirtyChange?: (dirty: boolean) => void
}

interface TransactionFormInnerProps {
  transaction: TransactionRow | null
  accounts: Account[]
  categories: Category[]
  orgMembers: OrgMember[]
  onClose: () => void
  onDirtyChange?: (dirty: boolean) => void
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
      onDirtyChange={onDirtyChange}
    />
  )
}

// CR-01: syncs the locked description template to form state on change.
// The (field) => (...) render prop cannot call hooks directly, so this helper
// component uses useEffect to write lockedValue into field state.
interface DescriptionSyncerProps {
  isLocked: boolean
  lockedValue: string
  onSync: (value: string) => void
}

function DescriptionSyncer({ isLocked, lockedValue, onSync }: DescriptionSyncerProps) {
  useEffect(() => {
    if (isLocked && lockedValue) {
      onSync(lockedValue)
    }
  }, [isLocked, lockedValue, onSync])
  return null
}

interface RefundDataLoaderProps {
  refundOfId: string | null
  onDescChanged: (desc: string) => void
  onAssigneesChanged: (ids: string[]) => void
}

function RefundDataLoader({ refundOfId, onDescChanged, onAssigneesChanged }: RefundDataLoaderProps) {
  const { data } = useGetTransaction(refundOfId)
  useEffect(() => {
    if (!refundOfId) {
      onDescChanged('')
      onAssigneesChanged([])
      return
    }
    if (data) {
      onDescChanged(data.description)
      onAssigneesChanged((data.assignees ?? []).map((a) => a.memberId))
    }
  }, [refundOfId, data, onDescChanged, onAssigneesChanged])
  return null
}

function DirtyNotifier({ isDirty, onChange }: { isDirty: boolean; onChange: (d: boolean) => void }) {
  useEffect(() => {
    onChange(isDirty)
  }, [isDirty, onChange])
  return null
}

/** Types whose description is always locked (D-11, D-12) */
const LOCKED_TYPES = ['transfer', 'settlement', 'contribution'] as const
type LockedType = (typeof LOCKED_TYPES)[number]

function isLockedType(type: string): type is LockedType {
  return (LOCKED_TYPES as readonly string[]).includes(type)
}

const TransactionFormInner = ({
  transaction,
  accounts,
  categories,
  orgMembers,
  onClose,
  onDirtyChange,
}: TransactionFormInnerProps) => {
  const isEditing = transaction !== null
  const createMutation = useCreateTransaction()
  const updateMutation = useUpdateTransaction(transaction?.id ?? '')
  const deleteMutation = useDeleteTransaction()

  const [dateOpen, setDateOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [isDescriptionUnlocked, setIsDescriptionUnlocked] = useState(false)
  const [refundOriginalDesc, setRefundOriginalDesc] = useState('')
  const [refundOriginalAssigneeIds, setRefundOriginalAssigneeIds] = useState<string[]>([])

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
      {/* Fetch original transaction data when refundOf is set */}
      <form.Subscribe selector={(s) => s.values.refundOf}>
        {(refundOf) => (
          <RefundDataLoader
            refundOfId={refundOf || null}
            onDescChanged={setRefundOriginalDesc}
            onAssigneesChanged={setRefundOriginalAssigneeIds}
          />
        )}
      </form.Subscribe>

      {/* Notify parent of dirty state for sheet-level discard guard */}
      {onDirtyChange ? (
        <form.Subscribe selector={(s) => s.isDirty}>
          {(isDirty) => <DirtyNotifier isDirty={isDirty} onChange={onDirtyChange} />}
        </form.Subscribe>
      ) : null}

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
          <form.Subscribe selector={(s) => s.values.type}>
            {(type) => (
          <form.AppField
            name="accountId"
            validators={{
              onChange: ({ value }: { value: string }) =>
                !value ? 'Account is required.' : undefined,
            }}
          >
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                <FieldLabel htmlFor="tx-accountId">{type === 'contribution' ? 'From' : 'Account'}</FieldLabel>
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
            )}
          </form.Subscribe>

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Base field: description — locked for transfer/settlement/contribution/linked-refund (D-11, D-12) */}
          <form.Subscribe
            selector={(s) => ({
              type: s.values.type,
              accountId: s.values.accountId,
              counterpartAccountId: s.values.counterpartAccountId,
              refundOf: s.values.refundOf,
            })}
          >
            {({ type, accountId, counterpartAccountId, refundOf }) => {
              const shouldLock =
                isLockedType(type) || (type === 'refund' && !!refundOf)
              const isLocked = !isDescriptionUnlocked && shouldLock

              // Compute locked description template from reactive account values
              const primaryAccount = accounts.find((a) => a.id === accountId)
              const counterpartAccount = accounts.find((a) => a.id === counterpartAccountId)

              let lockedValue = ''
              if (type === 'transfer') {
                const from = primaryAccount?.name ?? '…'
                const to = counterpartAccount?.name ?? '…'
                lockedValue = `Transfer from ${from} to ${to}`
              } else if (type === 'settlement') {
                lockedValue = counterpartAccount
                  ? `Settlement \u2014 paid from ${counterpartAccount.name}`
                  : 'Settlement'
              } else if (type === 'contribution') {
                const from = primaryAccount?.name ?? '…'
                const to = counterpartAccount?.name ?? '…'
                lockedValue = `Contribution from ${from} to ${to}`
              } else if (type === 'refund' && refundOf) {
                lockedValue = refundOriginalDesc ? `Refund of ${refundOriginalDesc}` : ''
              }

              return (
                <form.AppField
                  name="description"
                  validators={{
                    onChange: ({ value }: { value: string }) =>
                      !isLocked && !value?.trim() ? 'Description is required.' : undefined,
                  }}
                >
                  {(field) => (
                    <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                      <DescriptionSyncer
                        isLocked={isLocked}
                        lockedValue={lockedValue}
                        onSync={field.handleChange}
                      />
                      <FieldLabel htmlFor="tx-description">Description</FieldLabel>
                      {isLocked ? (
                        <InputGroup>
                          <InputGroupAddon align="inline-start">
                            <InputGroupText>
                              <Lock className="size-3.5 text-muted-foreground" aria-hidden="true" />
                            </InputGroupText>
                          </InputGroupAddon>
                          <InputGroupInput
                            readOnly
                            value={lockedValue}
                            className="bg-muted text-muted-foreground cursor-default"
                            aria-label="Description (auto-generated)"
                            autoComplete="off"
                          />
                          <InputGroupAddon align="inline-end">
                            <Tooltip>
                              <TooltipTrigger>
                                <InputGroupButton
                                  type="button"
                                  aria-label="Edit description"
                                  onClick={() => setIsDescriptionUnlocked(true)}
                                >
                                  <SquarePen className="size-3.5" aria-hidden="true" />
                                </InputGroupButton>
                              </TooltipTrigger>
                              <TooltipContent>Edit description</TooltipContent>
                            </Tooltip>
                          </InputGroupAddon>
                        </InputGroup>
                      ) : (
                        <Input
                          id="tx-description"
                          autoComplete="off"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                      )}
                      {field.state.meta.errors.length > 0 ? (
                        <FieldError>{String(field.state.meta.errors[0])}</FieldError>
                      ) : null}
                      {/* TODO(03.4-deferred): originalDescription column — add when schema patch lands */}
                      {/* D-19: import caption (└ Original: ...) is deferred because originalDescription */}
                      {/* and originalMerchant columns are absent from the current DB schema. */}
                    </Field>
                  )}
                </form.AppField>
              )
            }}
          </form.Subscribe>

          {/* Reset unlock state when type changes away from a locked type (D-12) */}
          <form.Subscribe selector={(s) => s.values.type}>
            {(type) => (
              <UnlockResetter
                type={type}
                onReset={() => setIsDescriptionUnlocked(false)}
              />
            )}
          </form.Subscribe>

          {/* Notes + Tag picker — side-by-side flex row (D-21, UI-SPEC Notes section) */}
          <div className="flex gap-4">
            {/* Notes field */}
            <form.AppField name="notes">
              {(field) => (
                <Field className="flex-1">
                  <FieldLabel htmlFor="tx-notes">Notes</FieldLabel>
                  <Textarea
                    id="tx-notes"
                    rows={2}
                    className="resize-none"
                    autoComplete="off"
                    placeholder="Add a note…"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </Field>
              )}
            </form.AppField>

            {/* Tag picker — same row as notes, equal width */}
            <form.AppField name="tagIds">
              {(field) => (
                <Field className="flex-1">
                  <FieldLabel>
                    Tags
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
          </div>

          {/* AssigneeSection — replaces SplitSection at top level (D-16, D-17, D-18) */}
          {/* form.Subscribe wraps AppField so amountCents is reactive on amount change */}
          <form.Subscribe selector={(s) => s.values.amount}>
            {(amount) => (
              <form.AppField
                name="assignees"
                validators={{
                  onChange: ({ value }: { value: AssigneeFormRow[] }) =>
                    value.length === 0 ? 'At least one assignee is required.' : undefined,
                }}
              >
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                    <AssigneeSection
                      value={field.state.value}
                      onChange={(assignees) => field.handleChange(assignees)}
                      amountCents={Math.round((amount ?? 0) * 100)}
                      orgMembers={orgMembers}
                      transaction={transaction}
                      refundAssigneeIds={!isEditing && refundOriginalAssigneeIds.length > 0 ? refundOriginalAssigneeIds : undefined}
                    />
                    {field.state.meta.errors.length > 0 ? (
                      <FieldError>{String(field.state.meta.errors[0])}</FieldError>
                    ) : null}
                  </Field>
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

/**
 * Helper component that resets the description unlock state when the type
 * transitions away from a locked type (D-12: unlock persists until type changes).
 *
 * Rendered as an invisible node inside form.Subscribe — useEffect tracks type
 * transitions without violating React rules of hooks.
 */
const UnlockResetter = ({
  type,
  onReset,
}: {
  type: string
  onReset: () => void
}) => {
  const prevTypeRef = useRef(type)

  useEffect(() => {
    const prev = prevTypeRef.current
    prevTypeRef.current = type

    // If the previous type was locked and the new type is not locked (or was locked but
    // is a different type), reset the unlock state so next time user visits a locked type
    // it starts locked again.
    const prevWasLocked = isLockedType(prev) || prev === 'refund'
    const nowIsLocked = isLockedType(type) || type === 'refund'

    if (prevWasLocked && !nowIsLocked) {
      onReset()
    } else if (prevWasLocked && nowIsLocked && prev !== type) {
      // Type changed between locked types (e.g. transfer → contribution) — reset too
      onReset()
    }
  }, [type, onReset])

  return null
}
