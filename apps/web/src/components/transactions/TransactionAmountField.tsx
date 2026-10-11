import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field';
import { dollarsToCents } from '@ploutizo/utils/currency';
import { CurrencyInput } from '@/components/currency/CurrencyInput';
import { formAmountToCents, rescaleAssigneesForAmount } from './assigneeSplit';
import type { TransactionFormInstance } from './hooks/useTransactionForm';

interface TransactionAmountFieldProps {
  form: TransactionFormInstance;
}

export const TransactionAmountField = ({
  form,
}: TransactionAmountFieldProps) => (
  <form.AppField
    name="amount"
    validators={{
      onSubmit: ({ value }: { value: number | undefined }) =>
        value === undefined ||
        !Number.isFinite(value) ||
        dollarsToCents(value) < 1
          ? 'Amount must be a finite number greater than zero and at least 1 cent.'
          : undefined,
    }}
  >
    {(field) => (
      <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
        <FieldLabel htmlFor="tx-amount">Amount</FieldLabel>
        <CurrencyInput
          id="tx-amount"
          aria-invalid={field.state.meta.errors.length > 0}
          value={field.state.value}
          onChange={(amount) => {
            field.handleChange(amount);
            const current = form.getFieldValue('assignees');
            const next = rescaleAssigneesForAmount(
              current,
              formAmountToCents(amount)
            );
            if (next !== current) form.setFieldValue('assignees', next);
          }}
          onBlur={field.handleBlur}
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
