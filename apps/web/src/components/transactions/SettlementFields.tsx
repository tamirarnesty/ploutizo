import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import type { Account } from '@ploutizo/types';
import type { TransactionFormInstance } from './hooks/useTransactionForm';

export interface SettlementFieldsProps {
  form: TransactionFormInstance;
  accounts: Account[];
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
            items={accounts.map((account) => ({
              label: account.name,
              value: account.id,
            }))}
            value={field.state.value}
            onValueChange={(v) => {
              if (v !== null) field.handleChange(v);
            }}
          >
            <SelectTrigger id="tx-settlement-source">
              <SelectValue>
                {(selected: string) =>
                  accounts.find((account) => account.id === selected)?.name ??
                  'Select account'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {field.state.meta.errors.length > 0 ? (
            <FieldError
              errors={
                field.state.meta.errors as unknown as { message?: string }[]
              }
            />
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
          <FieldLabel htmlFor="tx-settlement-destination">
            Destination
          </FieldLabel>
          <Select
            items={accounts.map((account) => ({
              label: account.name,
              value: account.id,
            }))}
            value={field.state.value}
            onValueChange={(v) => {
              if (v !== null) field.handleChange(v);
            }}
          >
            <SelectTrigger id="tx-settlement-destination">
              <SelectValue>
                {(selected: string) =>
                  accounts.find((account) => account.id === selected)?.name ??
                  'Select account'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {field.state.meta.errors.length > 0 ? (
            <FieldError
              errors={
                field.state.meta.errors as unknown as { message?: string }[]
              }
            />
          ) : null}
        </Field>
      )}
    </form.AppField>
  </div>
);
