import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select'
import type { Account } from '@ploutizo/types'
import type { TransactionFormInstance } from './hooks/useTransactionForm'

export interface TransferFieldsProps {
  form: TransactionFormInstance
  accounts: Account[]
}

export const TransferFields = ({ form, accounts }: TransferFieldsProps) => (
  <form.AppField
    name="counterpartAccountId"
    validators={{
      onChange: ({ value }: { value: string }) =>
        !value ? 'Destination account is required.' : undefined,
    }}
  >
    {(field) => (
      <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
        <FieldLabel htmlFor="tx-counterpartAccountId">To account</FieldLabel>
        <Select
          value={field.state.value}
          onValueChange={(v) => {
            if (v !== null) field.handleChange(v)
          }}
        >
          <SelectTrigger id="tx-counterpartAccountId">
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
)
