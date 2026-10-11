import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field';
import { DatePicker } from '@ploutizo/ui/components/date-picker';
import type { Account } from '@ploutizo/validators';
import {
  getTransactionFormArchiveDateError,
  getTransactionFormLastAvailableDate,
} from './getTransactionFormArchiveDate';
import type { TransactionFormInstance } from './hooks/useTransactionForm';

export const TransactionDateField = ({
  form,
  accounts,
  accountId,
  counterpartAccountId,
}: {
  form: TransactionFormInstance;
  accounts: Account[];
  accountId: string;
  counterpartAccountId: string;
}) => {
  const lastAvailable = getTransactionFormLastAvailableDate(
    accounts,
    accountId,
    counterpartAccountId
  );

  return (
    <form.AppField
      name="date"
      validators={{
        onSubmit: ({ value }: { value: string }) => {
          if (!value) return 'Date is required.';
          return getTransactionFormArchiveDateError({
            accounts,
            date: value,
            accountId,
            counterpartAccountId,
          });
        },
      }}
    >
      {(field) => (
        <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
          <FieldLabel>Date</FieldLabel>
          <DatePicker
            id="tx-date"
            value={field.state.value}
            onChange={field.handleChange}
            disabledDates={lastAvailable ? { after: lastAvailable } : undefined}
          />
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
      )}
    </form.AppField>
  );
};
