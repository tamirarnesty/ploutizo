import { Field, FieldLabel } from '@ploutizo/ui/components/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import type { Account } from '@ploutizo/types';
import { getTransactionFormAccountOptions } from './getTransactionFormAccountOptions';
import type { TransactionFormInstance } from './hooks/useTransactionForm';
import type { TransactionFormValues } from './types';

export interface ContributionFieldsProps {
  form: TransactionFormInstance;
  accounts: Account[];
}

export const ContributionFields = ({
  form,
  accounts,
}: ContributionFieldsProps) => (
  <form.Subscribe
    selector={(s: { values: TransactionFormValues }) => ({
      accountId: s.values.accountId,
      counterpartAccountId: s.values.counterpartAccountId,
    })}
  >
    {({ accountId, counterpartAccountId }) => {
      const destinationAccounts = getTransactionFormAccountOptions({
        type: 'contribution',
        slot: 'counterpartAccountId',
        accounts,
        otherSelectedAccountId: accountId,
        preserveAccountId: counterpartAccountId,
      });

      return (
        <form.AppField name="counterpartAccountId">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="tx-contribution-counterpartAccountId">
                Destination
              </FieldLabel>
              <Select
                items={destinationAccounts.map((account) => ({
                  label: account.name,
                  value: account.id,
                }))}
                value={field.state.value}
                onValueChange={(v) => {
                  if (v !== null) field.handleChange(v);
                }}
              >
                <SelectTrigger id="tx-contribution-counterpartAccountId">
                  <SelectValue>
                    {(selected: string) =>
                      accounts.find((account) => account.id === selected)
                        ?.name ?? 'Select account'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {destinationAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.AppField>
      );
    }}
  </form.Subscribe>
);
