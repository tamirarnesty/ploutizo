import { Text } from '@ploutizo/ui/components/text'
import { Field, FieldLabel } from '@ploutizo/ui/components/field'
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

export const SettlementFields = ({ form, accounts }: SettlementFieldsProps) => (
  <form.AppField name="counterpartAccountId">
    {(field) => (
      <Field>
        <FieldLabel htmlFor="tx-counterpartAccountId">
          Paid from
          <Text as="span" variant="body-sm" className="font-normal text-muted-foreground">
            (optional)
          </Text>
        </FieldLabel>
        <Select
          value={field.state.value}
          onValueChange={(v) => {
            if (v !== null) field.handleChange(v)
          }}
        >
          <SelectTrigger id="tx-counterpartAccountId">
            <SelectValue>
              {accounts.find((a) => a.id === field.state.value)?.name ?? 'Select account (optional)'}
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
      </Field>
    )}
  </form.AppField>
)
