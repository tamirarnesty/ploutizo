import { Field, FieldLabel } from '@ploutizo/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select'
import { ExpenseFields } from './ExpenseFields'
import { RefundFields } from './RefundFields'
import { IncomeFields } from './IncomeFields'
import { TransferFields } from './TransferFields'
import { SettlementFields } from './SettlementFields'
import { ContributionFields } from './ContributionFields'
import type { useTransactionForm } from './hooks/useTransactionForm'
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
  form: ReturnType<typeof useTransactionForm>['form']
  accounts: Account[]
  categories: Category[]
  onAssigneesChange: (assignees: AssigneeFormRow[]) => void
}

export const TransactionTypeFields = ({
  form,
  accounts,
  categories,
  onAssigneesChange,
}: TransactionTypeFieldsProps) => (
  <>
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

    <form.Subscribe selector={(s) => s.values.type}>
      {(type) => {
        if (type === 'expense') return <ExpenseFields form={form} categories={categories} />
        if (type === 'refund')
          return (
            <RefundFields form={form} categories={categories} onAssigneesChange={onAssigneesChange} />
          )
        if (type === 'income') return <IncomeFields form={form} />
        if (type === 'transfer') return <TransferFields form={form} accounts={accounts} />
        if (type === 'settlement') return <SettlementFields form={form} accounts={accounts} />
        if (type === 'contribution') return <ContributionFields form={form} />
        return null
      }}
    </form.Subscribe>
  </>
)
