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
import { AccountSlotEmptyState } from './AccountSlotEmptyState';
import { getTransactionFormAccountOptions } from './getTransactionFormAccountOptions';
import { getTransactionFormAccountSlots } from './getTransactionFormAccountSlots';
import type { TransactionFormAccountSlot } from './getTransactionFormAccountSlots';
import type { TransactionFormInstance } from './hooks/useTransactionForm';
import type { TransactionFormValues } from './types';

export interface TransactionAccountSlotsProps {
  form: TransactionFormInstance;
  accounts: Account[];
}

const requiredMessage = (label: TransactionFormAccountSlot['label']): string =>
  label === 'Account'
    ? 'Account is required.'
    : `${label} account is required.`;

const otherSlotField = (
  field: TransactionFormAccountSlot['field']
): TransactionFormAccountSlot['field'] =>
  field === 'accountId' ? 'counterpartAccountId' : 'accountId';

interface AccountSlotSelectProps {
  form: TransactionFormInstance;
  slot: TransactionFormAccountSlot;
  accounts: Account[];
  options: Account[];
}

const AccountSlotSelect = ({
  form,
  slot,
  accounts,
  options,
}: AccountSlotSelectProps) => (
  <form.AppField
    name={slot.field}
    validators={{
      onSubmit: ({ value }: { value: string }) =>
        slot.required && !value ? requiredMessage(slot.label) : undefined,
    }}
  >
    {(field) =>
      options.length === 0 ? (
        <AccountSlotEmptyState label={slot.label} />
      ) : (
        <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
          <FieldLabel htmlFor={`tx-${slot.field}`}>{slot.label}</FieldLabel>
          <Select
            items={options.map((account) => ({
              label: account.name,
              value: account.id,
            }))}
            value={field.state.value}
            onValueChange={(v) => {
              if (v !== null) field.handleChange(v);
            }}
          >
            <SelectTrigger id={`tx-${slot.field}`}>
              <SelectValue>
                {(selected: string) =>
                  accounts.find((account) => account.id === selected)?.name ??
                  'Select account'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {options.map((account) => (
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
                field.state.meta.errors as unknown as {
                  message?: string;
                }[]
              }
            />
          ) : null}
        </Field>
      )
    }
  </form.AppField>
);

export const TransactionAccountSlots = ({
  form,
  accounts,
}: TransactionAccountSlotsProps) => (
  <form.Subscribe
    selector={(s: { values: TransactionFormValues }) => ({
      type: s.values.type,
      accountId: s.values.accountId,
      counterpartAccountId: s.values.counterpartAccountId,
    })}
  >
    {({ type, accountId, counterpartAccountId }) => {
      const slots = getTransactionFormAccountSlots(type);
      const selectedByField = { accountId, counterpartAccountId };
      const fields = slots.map((slot) => {
        const otherSelectedAccountId =
          slots.length > 1 ? selectedByField[otherSlotField(slot.field)] : '';
        const options = getTransactionFormAccountOptions({
          type,
          slot: slot.field,
          accounts,
          otherSelectedAccountId,
          preserveAccountId: selectedByField[slot.field],
        });

        return (
          <AccountSlotSelect
            key={slot.field}
            form={form}
            slot={slot}
            accounts={accounts}
            options={options}
          />
        );
      });

      if (fields.length <= 1) return fields;

      return <div className="grid grid-cols-2 gap-4">{fields}</div>;
    }}
  </form.Subscribe>
);
