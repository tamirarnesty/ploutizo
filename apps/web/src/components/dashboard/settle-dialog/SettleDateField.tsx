import { DatePicker } from '@ploutizo/ui/components/date-picker';
import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field';
import type { SettleFieldErrors } from '@/components/dashboard/settle-dialog/settleDialogFieldTypes';

export type SettleDateFieldProps = {
  value: string;
  errors: SettleFieldErrors;
  onChange: (isoDate: string) => void;
  onBlur: () => void;
};

export const SettleDateField = ({
  value,
  errors,
  onChange,
  onBlur,
}: SettleDateFieldProps) => (
  <Field data-invalid={errors.length > 0 || undefined}>
    <FieldLabel>Date</FieldLabel>
    <DatePicker
      id="settle-date"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
    />
    {errors.length > 0 ? <FieldError errors={errors} /> : null}
  </Field>
);
