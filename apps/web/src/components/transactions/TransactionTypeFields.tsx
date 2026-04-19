import { Field, FieldLabel } from '@ploutizo/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select'
import { Text } from '@ploutizo/ui/components/text'
import { ExpenseFields } from './ExpenseFields'
import { IncomeFields } from './IncomeFields'
import { TransferFields } from './TransferFields'
import { SettlementFields } from './SettlementFields'
import { ContributionFields } from './ContributionFields'
import { RefundLinker } from './RefundLinker'
import type { TransactionFormInstance } from './hooks/useTransactionForm'
import type { AssigneeFormRow, TransactionFormValues } from './types'
import type { Category } from '@/lib/data-access/categories'
import type { Account } from '@ploutizo/types'

// TODO(03.4-deferred): originalDescription column — add when schema patch lands
// D-19: import caption (└ Original: ...) is deferred because originalDescription
// and originalMerchant columns are absent from the current DB schema.

const TYPE_LABELS: Record<string, string> = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
  settlement: 'Settlement',
  refund: 'Refund',
  contribution: 'Contribution',
}

interface TransactionTypeFieldsProps {
  form: TransactionFormInstance
  accounts: Account[]
  categories: Category[]
  onAssigneesChange: (assignees: AssigneeFormRow[]) => void
}

/**
 * Module-scope: avoids re-mount on each render (vercel-react-best-practices rerender-*)
 */
const TypeSelectField = ({ form }: { form: TransactionFormInstance }) => (
  <form.AppField
    name="type"
    listeners={{
      onChange: () => {
        // Clear ALL type-specific fields unconditionally — no if-guard (D-07)
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
          onValueChange={(v) => field.handleChange(v as TransactionFormValues['type'])}
        >
          <SelectTrigger id="tx-type" autoFocus>
            {/* autoFocus: type is the primary purpose of opening the sheet (per web-design-guidelines) */}
            <SelectValue>{TYPE_LABELS[field.state.value] ?? 'Select type'}</SelectValue>
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
)

/** Category Select for refund type — col 2 in the 2-column grid */
const RefundCategoryField = ({
  form,
  categories,
}: {
  form: TransactionFormInstance
  categories: Category[]
}) => (
  <form.AppField name="categoryId">
    {(field) => (
      <Field>
        <FieldLabel htmlFor="tx-refund-categoryId">
          Category
          <Text as="span" variant="body-sm" className="ml-1 font-normal text-muted-foreground">
            (optional)
          </Text>
        </FieldLabel>
        <Select
          value={field.state.value}
          onValueChange={(v) => { if (v !== null) field.handleChange(v) }}
        >
          <SelectTrigger id="tx-refund-categoryId">
            <SelectValue>
              {categories.find((c) => c.id === field.state.value)?.name ?? 'Select category'}
            </SelectValue>
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
)

export const TransactionTypeFields = ({
  form,
  accounts,
  categories,
  onAssigneesChange,
}: TransactionTypeFieldsProps) => (
  <form.Subscribe selector={(s) => s.values.type}>
    {(type) => {
      const showGrid = type === 'expense' || type === 'refund'

      return (
        <>
          {showGrid ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Type Select — col 1 */}
              <TypeSelectField form={form} />
              {/* Category — col 2 */}
              {type === 'expense' ? (
                <ExpenseFields form={form} categories={categories} />
              ) : (
                <RefundCategoryField form={form} categories={categories} />
              )}
            </div>
          ) : (
            /* Full-width type Select for non-expense/refund */
            <TypeSelectField form={form} />
          )}

          {/* Type-specific fields below the type row */}
          {type === 'refund' ? (
            <RefundLinker form={form} onAssigneesChange={onAssigneesChange} />
          ) : null}
          {type === 'income' ? <IncomeFields form={form} /> : null}
          {type === 'transfer' ? <TransferFields form={form} accounts={accounts} /> : null}
          {type === 'settlement' ? <SettlementFields form={form} accounts={accounts} /> : null}
          {type === 'contribution' ? <ContributionFields form={form} /> : null}
        </>
      )
    }}
  </form.Subscribe>
)
