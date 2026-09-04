import { useMemo } from 'react';
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
import type { TransactionFormInstance } from './hooks/useTransactionForm';

export interface ContributionFieldsProps {
  form: TransactionFormInstance;
  accounts: Account[];
}

export const ContributionFields = ({
  form,
  accounts,
}: ContributionFieldsProps) => {
  const investmentAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'investment'),
    [accounts]
  );

  const accountMap = useMemo(
    () => new Map(investmentAccounts.map((a) => [a.id, a])),
    [investmentAccounts]
  );

  return (
    <form.AppField name="counterpartAccountId">
      {(field) => (
        <Field>
          <FieldLabel htmlFor="tx-contribution-counterpartAccountId">
            Destination
          </FieldLabel>
          <Select
            items={investmentAccounts.map((account) => ({
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
                  accountMap.get(selected)?.name ?? 'Select account'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {investmentAccounts.map((account) => (
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
};
