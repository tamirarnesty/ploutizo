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
import {
  getTransactionFormAccountOptionLabel,
  getTransactionFormArchiveDateError,
} from './getTransactionFormArchiveDate';
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
  date: string;
  otherSelectedAccountId: string;
}

const AccountSlotSelect = ({
  form,
  slot,
  accounts,
  options,
  date,
  otherSelectedAccountId,
}: AccountSlotSelectProps) => (
  <form.AppField
    name={slot.field}
    validators={{
      onSubmit: ({ value }: { value: string }) => {
        if (slot.required && !value) return requiredMessage(slot.label);
        return getTransactionFormArchiveDateError({
          accounts,
          date,
          accountId:
            slot.field === 'accountId' ? value : otherSelectedAccountId,
          counterpartAccountId:
            slot.field === 'counterpartAccountId'
              ? value
              : otherSelectedAccountId,
          field: slot.field,
        });
      },
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
              label: getTransactionFormAccountOptionLabel(account),
              value: account.id,
            }))}
            value={field.state.value}
            onValueChange={(v) => {
              if (v !== null) field.handleChange(v);
            }}
          >
            <SelectTrigger id={`tx-${slot.field}`}>
              <SelectValue>
                {(selected: string) => {
                  const selectedAccount = accounts.find(
                    (account) => account.id === selected
                  );
                  return selectedAccount
                    ? getTransactionFormAccountOptionLabel(selectedAccount)
                    : 'Select account';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {options.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {getTransactionFormAccountOptionLabel(account)}
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
      date: s.values.date,
      accountId: s.values.accountId,
      counterpartAccountId: s.values.counterpartAccountId,
    })}
  >
    {({ type, date, accountId, counterpartAccountId }) => {
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
          asOfDate: date,
        });

        return (
          <AccountSlotSelect
            key={slot.field}
            form={form}
            slot={slot}
            accounts={accounts}
            options={options}
            date={date}
            otherSelectedAccountId={otherSelectedAccountId}
          />
        );
      });

      if (fields.length <= 1) return fields;

      return <div className="grid grid-cols-2 gap-4">{fields}</div>;
    }}
  </form.Subscribe>
);
