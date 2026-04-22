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

export interface SettlementFieldsProps {
  form: TransactionFormInstance
  accounts: Account[]
}

// Settlement inverts the generic Source/Destination mapping:
//   accountId           = Destination (credit card being paid off) — shown in Account table column
//   counterpartAccountId = Source (bank account funding the payment)
// Both fields are rendered here so TransactionForm can skip the generic sourceField for settlement.
export const SettlementFields = ({ form, accounts }: SettlementFieldsProps) => (
  <div className="grid grid-cols-2 gap-4">
    <form.AppField
      name="counterpartAccountId"
      validators={{
        onChange: ({ value }: { value: string }) =>
          !value ? 'Source account is required.' : undefined,
      }}
    >
      {(field) => (
        <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
          <FieldLabel htmlFor="tx-settlement-source">Source</FieldLabel>
          <Select
            value={field.state.value}
            onValueChange={(v) => { if (v !== null) field.handleChange(v) }}
          >
            <SelectTrigger id="tx-settlement-source">
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

    <form.AppField
      name="accountId"
      validators={{
        onChange: ({ value }: { value: string }) =>
          !value ? 'Destination account is required.' : undefined,
      }}
    >
      {(field) => (
        <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
          <FieldLabel htmlFor="tx-settlement-destination">Destination</FieldLabel>
          <Select
            value={field.state.value}
            onValueChange={(v) => { if (v !== null) field.handleChange(v) }}
          >
            <SelectTrigger id="tx-settlement-destination">
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
  </div>
)
