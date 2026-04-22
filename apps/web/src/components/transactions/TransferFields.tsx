import { useEffect, useMemo, useRef } from 'react'
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
import type { TransactionFormValues } from './types'

export interface TransferFieldsProps {
  form: TransactionFormInstance
  accounts: Account[]
}

// Minimal structural interface for the field render-prop — avoids the full 23-param
// FieldApi generic which can't be expressed concisely here.
interface FieldHandle {
  state: { value: string; meta: { errors: unknown[] } }
  handleChange: (v: string) => void
}

// Inner component extracted so useMemo and useEffect are called at a proper
// React component boundary — not inside a render-prop callback.
interface TransferDestinationFieldProps {
  sourceAccountId: string
  accounts: Account[]
  field: FieldHandle
}

const TransferDestinationField = ({
  sourceAccountId,
  accounts,
  field,
}: TransferDestinationFieldProps) => {
  // Compute destination list — excludes source account.
  const destinationAccounts = useMemo(
    () => accounts.filter((a) => a.id !== sourceAccountId),
    [accounts, sourceAccountId],
  )

  // Clear the destination selection only when sourceAccountId *changes* to
  // collide with the current value — not on initial mount.
  // useRef guard prevents the effect from firing on the first render.
  const initialMountRef = useRef(true)
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false
      return
    }
    if (field.state.value && field.state.value === sourceAccountId) {
      field.handleChange('')
    }
  }, [sourceAccountId]) // eslint-disable-line react-hooks/exhaustive-deps
  // field intentionally omitted — we only want to react to sourceAccountId changes.
  // field.state.value and field.handleChange are stable across the same field instance.

  return (
    <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
      <FieldLabel htmlFor="tx-counterpartAccountId">Destination</FieldLabel>
      <Select
        value={field.state.value}
        onValueChange={(v) => {
          if (v !== null) field.handleChange(v)
        }}
      >
        <SelectTrigger id="tx-counterpartAccountId">
          <SelectValue>
            {destinationAccounts.find((a) => a.id === field.state.value)?.name ?? 'Select account'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {destinationAccounts.map((a) => (
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
  )
}

export const TransferFields = ({ form, accounts }: TransferFieldsProps) => (
  // Subscribe to accountId so the destination list reacts to source changes.
  <form.Subscribe selector={(s: { values: TransactionFormValues }) => s.values.accountId}>
    {(sourceAccountId: string) => (
      <form.AppField
        name="counterpartAccountId"
        validators={{
          onChange: ({ value }: { value: string }) =>
            !value ? 'Destination account is required.' : undefined,
        }}
      >
        {(field: unknown) => (
          <TransferDestinationField
            sourceAccountId={sourceAccountId}
            accounts={accounts}
            field={field as FieldHandle}
          />
        )}
      </form.AppField>
    )}
  </form.Subscribe>
)
