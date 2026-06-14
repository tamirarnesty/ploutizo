import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field';
import type { SettleFieldErrors } from '@/components/dashboard/settle-dialog/settleDialogFieldTypes';
import { CurrencyInput } from '@/components/currency/CurrencyInput';

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
    <CurrencyInput
      id="settle-amount"
      commitEmptyAs={0}
      aria-invalid={errors.length > 0}
      value={value > 0 ? value : undefined}
      onChange={(v) => onChange(v ?? 0)}
      onBlur={onBlur}
    />
    {errors.length > 0 ? <FieldError errors={errors} /> : null}
  </Field>
);
