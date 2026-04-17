import React, { useState } from 'react'
import { Text } from '@ploutizo/ui/components/text'
import {
  Field,
  FieldError,
  FieldLabel,
} from '@ploutizo/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select'
import { Input } from '@ploutizo/ui/components/input'
import { Spinner } from '@ploutizo/ui/components/spinner'
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@ploutizo/ui/components/combobox'
import { useSearchTransactions } from '@/lib/data-access/transactions'
import { formatCurrency } from '@/lib/formatCurrency'
import type { Account } from '@ploutizo/types'
import type { Category } from '@/lib/data-access/categories'
import type { AssigneeFormRow, TransactionFormValues } from './types'
import type { useTransactionForm } from './hooks/useTransactionForm'

// TODO(03.4-deferred): originalDescription column — add when schema patch lands
// D-19: import caption (└ Original: ...) is deferred because originalDescription
// and originalMerchant columns are absent from the current DB schema.
// Add inline caption rendering here once the schema patch ships.

interface TransactionTypeFieldsProps {
  form: ReturnType<typeof useTransactionForm>['form']
  accounts: Account[]
  categories: Category[]
  onAssigneesChange: (assignees: AssigneeFormRow[]) => void // for refundOf pre-fill (D-16)
}

// ---- Inner components defined at module scope (not inside render function) ----

interface ExpenseFieldsProps {
  form: TransactionTypeFieldsProps['form']
  categories: Category[]
}

function ExpenseFields({ form, categories }: ExpenseFieldsProps) {
  return (
    <form.AppField
      name="categoryId"
      validators={{
        onChange: ({ value }: { value: string }) =>
          !value ? 'Category is required for expense transactions.' : undefined,
      }}
    >
      {(field) => (
        <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
          <FieldLabel htmlFor="tx-categoryId">Category</FieldLabel>
          <Select
            value={field.state.value}
            onValueChange={(v) => { if (v !== null) field.handleChange(v) }}
          >
            <SelectTrigger id="tx-categoryId">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
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
  )
}

interface RefundFieldsProps {
  form: TransactionTypeFieldsProps['form']
  categories: Category[]
  onAssigneesChange: (assignees: AssigneeFormRow[]) => void
}

function RefundFields({ form, categories, onAssigneesChange }: RefundFieldsProps) {
  return (
    <>
      {/* Category (optional for refund) */}
      <form.AppField name="categoryId">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="tx-refund-categoryId">
              Category{' '}
              <Text as="span" variant="body-sm" className="font-normal text-muted-foreground">
                (optional)
              </Text>
            </FieldLabel>
            <Select
              value={field.state.value}
              onValueChange={(v) => { if (v !== null) field.handleChange(v) }}
            >
              <SelectTrigger id="tx-refund-categoryId">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </form.AppField>

      {/* Refund linker */}
      <RefundLinker form={form} onAssigneesChange={onAssigneesChange} />
    </>
  )
}

interface RefundLinkerProps {
  form: TransactionTypeFieldsProps['form']
  onAssigneesChange: (assignees: AssigneeFormRow[]) => void
}

function RefundLinker({ form, onAssigneesChange }: RefundLinkerProps) {
  const [debouncedQuery, setDebouncedQuery] = useState('')
  // useRef-based debounce: clear previous timer, set new one (no cleanup return needed)
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: searchResults = [], isLoading: searching } =
    useSearchTransactions(debouncedQuery)

  // Map for O(1) lookup in onValueChange (D-16 pre-fill)
  const searchResultsById = React.useMemo(
    () => new Map(searchResults.map((tx) => [tx.id, tx])),
    [searchResults]
  )

  return (
    <form.AppField name="refundOf">
      {(field) => (
        <Field>
          <FieldLabel>
            Refund of{' '}
            <Text as="span" variant="body-sm" className="font-normal text-muted-foreground">
              (optional)
            </Text>
          </FieldLabel>
          <Combobox
            value={field.state.value || null}
            onValueChange={(v: string | null) => {
              field.handleChange(v ?? '')
              // D-16: pre-fill assignees from selected transaction's assignees
              if (v) {
                const original = searchResultsById.get(v)
                if (original) {
                  onAssigneesChange(
                    original.assignees.map((a) => ({
                      memberId: a.memberId,
                      amountCents: a.amountCents,
                      percentage:
                        a.percentage !== null ? parseFloat(a.percentage) : 0,
                    }))
                  )
                }
              }
              // D-17: clearing refundOf does NOT reset split — no else branch
            }}
            onInputValueChange={(q: string) => {
              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
              debounceTimerRef.current = setTimeout(() => setDebouncedQuery(q), 300)
            }}
            items={searchResults.map((tx) => tx.id)}
          >
            <ComboboxInput
              placeholder="Search transactions…"
              showClear
              autoComplete="off"
            />
            <ComboboxContent>
              {searching ? (
                <div className="flex justify-center py-2">
                  <Spinner />
                </div>
              ) : null}
              <ComboboxList>
                {(id: string) => {
                  const tx = searchResultsById.get(id)
                  if (!tx) return null
                  return (
                    <ComboboxItem key={id} value={id}>
                      <span className="min-w-0 truncate">
                        {tx.description ?? tx.merchant ?? '—'}{' '}
                        &bull;{' '}
                        {new Date(tx.date + 'T00:00:00').toLocaleDateString(
                          'en-CA',
                          { month: 'short', day: 'numeric', year: 'numeric' }
                        )}{' '}
                        &bull;{' '}
                        {formatCurrency(tx.amount)}
                      </span>
                    </ComboboxItem>
                  )
                }}
              </ComboboxList>
              <ComboboxEmpty>No matching transactions found.</ComboboxEmpty>
            </ComboboxContent>
          </Combobox>
        </Field>
      )}
    </form.AppField>
  )
}

interface IncomeFieldsProps {
  form: TransactionTypeFieldsProps['form']
}

function IncomeFields({ form }: IncomeFieldsProps) {
  return (
    <>
      <form.AppField
        name="incomeType"
        validators={{
          onChange: ({ value }: { value: string }) =>
            !value ? 'Income type is required.' : undefined,
        }}
      >
        {(field) => (
          <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
            <FieldLabel htmlFor="tx-incomeType">Income type</FieldLabel>
            <Select
              value={field.state.value}
              onValueChange={(v) => { if (v !== null) field.handleChange(v) }}
            >
              <SelectTrigger id="tx-incomeType">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct_deposit">Direct deposit</SelectItem>
                <SelectItem value="e_transfer">e-Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {field.state.meta.errors.length > 0 ? (
              <FieldError>{String(field.state.meta.errors[0])}</FieldError>
            ) : null}
          </Field>
        )}
      </form.AppField>

      <form.AppField name="incomeSource">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="tx-incomeSource">
              Income source{' '}
              <Text as="span" variant="body-sm" className="font-normal text-muted-foreground">
                (optional)
              </Text>
            </FieldLabel>
            <Input
              id="tx-incomeSource"
              autoComplete="off"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
          </Field>
        )}
      </form.AppField>
    </>
  )
}

interface TransferFieldsProps {
  form: TransactionTypeFieldsProps['form']
  accounts: Account[]
}

function TransferFields({ form, accounts }: TransferFieldsProps) {
  return (
    <form.AppField
      name="toAccountId"
      validators={{
        onChange: ({ value }: { value: string }) =>
          !value ? 'Destination account is required.' : undefined,
      }}
    >
      {(field) => (
        <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
          <FieldLabel htmlFor="tx-toAccountId">To account</FieldLabel>
          <Select
            value={field.state.value}
            onValueChange={(v) => { if (v !== null) field.handleChange(v) }}
          >
            <SelectTrigger id="tx-toAccountId">
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
  )
}

interface SettlementFieldsProps {
  form: TransactionTypeFieldsProps['form']
  accounts: Account[]
}

function SettlementFields({ form, accounts }: SettlementFieldsProps) {
  return (
    <form.AppField name="settledAccountId">
      {(field) => (
        <Field>
          <FieldLabel htmlFor="tx-settledAccountId">
            Settlement account{' '}
            <Text as="span" variant="body-sm" className="font-normal text-muted-foreground">
              (optional)
            </Text>
          </FieldLabel>
          <Select
            value={field.state.value}
            onValueChange={(v) => { if (v !== null) field.handleChange(v) }}
          >
            <SelectTrigger id="tx-settledAccountId">
              <SelectValue placeholder="Select account (optional)" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    </form.AppField>
  )
}

interface ContributionFieldsProps {
  form: TransactionTypeFieldsProps['form']
}

function ContributionFields({ form }: ContributionFieldsProps) {
  return (
    <form.AppField name="investmentType">
      {(field) => (
        <Field>
          <FieldLabel htmlFor="tx-investmentType">
            Investment type{' '}
            <Text as="span" variant="body-sm" className="font-normal text-muted-foreground">
              (optional)
            </Text>
          </FieldLabel>
          <Select
            value={field.state.value}
            onValueChange={(v) => { if (v !== null) field.handleChange(v) }}
          >
            <SelectTrigger id="tx-investmentType">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tfsa">TFSA</SelectItem>
              <SelectItem value="rrsp">RRSP</SelectItem>
              <SelectItem value="fhsa">FHSA</SelectItem>
              <SelectItem value="resp">RESP</SelectItem>
              <SelectItem value="non_registered">Non-registered</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}
    </form.AppField>
  )
}

// ---- Main exported component ----

export function TransactionTypeFields({
  form,
  accounts,
  categories,
  onAssigneesChange,
}: TransactionTypeFieldsProps) {
  return (
    <>
      {/* Type Select with listeners that clear all type-specific fields on change */}
      <form.AppField
        name="type"
        listeners={{
          onChange: () => {
            // Clear ALL type-specific fields unconditionally — no if-guard (D-07)
            // The listener fires because the type actually changed,
            // so a guard checking equality would always be false when it runs.
            form.setFieldValue('categoryId', '')
            form.setFieldValue('refundOf', '')
            form.setFieldValue('incomeType', '')
            form.setFieldValue('incomeSource', '')
            form.setFieldValue('toAccountId', '')
            form.setFieldValue('settledAccountId', '')
            form.setFieldValue('investmentType', '')
          },
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="tx-type">Type</FieldLabel>
            <Select
              value={field.state.value}
              onValueChange={(v) =>
                field.handleChange(v as TransactionFormValues['type'])
              }
            >
              <SelectTrigger id="tx-type" autoFocus>
                {/* autoFocus: type is the primary purpose of opening the create sheet
                    (justified per web-design-guidelines: primary input in dialog context) */}
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="settlement">Settlement</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
                <SelectItem value="contribution">Contribution</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
      </form.AppField>

      {/* Conditional type-specific fields via form.Subscribe */}
      <form.Subscribe selector={(s) => s.values.type}>
        {(type) => {
          if (type === 'expense')
            return <ExpenseFields form={form} categories={categories} />
          if (type === 'refund')
            return (
              <RefundFields
                form={form}
                categories={categories}
                onAssigneesChange={onAssigneesChange}
              />
            )
          if (type === 'income') return <IncomeFields form={form} />
          if (type === 'transfer')
            return <TransferFields form={form} accounts={accounts} />
          if (type === 'settlement')
            return <SettlementFields form={form} accounts={accounts} />
          if (type === 'contribution')
            return <ContributionFields form={form} />
          return null
        }}
      </form.Subscribe>
    </>
  )
}
