import { Text } from '@ploutizo/ui/components/text'
import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field'
import { Input } from '@ploutizo/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select'
import type { useTransactionForm } from './hooks/useTransactionForm'

const INCOME_TYPE_LABELS: Record<string, string> = {
  direct_deposit: 'Direct deposit',
  e_transfer: 'e-Transfer',
  cash: 'Cash',
  cheque: 'Cheque',
  other: 'Other',
}

export interface IncomeFieldsProps {
  form: ReturnType<typeof useTransactionForm>['form']
}

export const IncomeFields = ({ form }: IncomeFieldsProps) => (
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
            onValueChange={(v) => {
              if (v !== null) field.handleChange(v)
            }}
          >
            <SelectTrigger id="tx-incomeType">
              <SelectValue>{INCOME_TYPE_LABELS[field.state.value] ?? 'Select type'}</SelectValue>
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
