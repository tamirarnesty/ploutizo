import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field';
import type { SettleFieldErrors } from '@/components/dashboard/settle-dialog/settleDialogFieldTypes';
import { FormattedAmountInput } from '@/components/transactions/FormattedAmountInput';

export type SettleAmountFieldProps = {
  value: number;
  errors: SettleFieldErrors;
  onChange: (next: number) => void;
  onBlur: () => void;
};

export const SettleAmountField = ({
  value,
  errors,
  onChange,
  onBlur,
}: SettleAmountFieldProps) => (
  <Field data-invalid={errors.length > 0 || undefined}>
    <FieldLabel htmlFor="settle-amount">Amount</FieldLabel>
    <FormattedAmountInput
      id="settle-amount"
      value={value > 0 ? value : undefined}
      onChange={(v) => onChange(Math.max(0, v ?? 0))}
      onBlur={onBlur}
    />
    {errors.length > 0 ? <FieldError errors={errors} /> : null}
  </Field>
);
