import { useMemo } from 'react'
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

export interface ContributionFieldsProps {
  form: TransactionFormInstance
  accounts: Account[]
}

export const ContributionFields = ({ form, accounts }: ContributionFieldsProps) => {
  const investmentAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'investment'),
    [accounts],
  )

  return (
    <form.AppField name="counterpartAccountId">
      {(field) => (
        <Field>
          <FieldLabel htmlFor="tx-contribution-counterpartAccountId">To</FieldLabel>
          <Select
            value={field.state.value}
            onValueChange={(v) => {
              if (v !== null) field.handleChange(v)
            }}
          >
            <SelectTrigger id="tx-contribution-counterpartAccountId">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {investmentAccounts.map((a) => (
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
