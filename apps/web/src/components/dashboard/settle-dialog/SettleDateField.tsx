import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field';
import { Input } from '@ploutizo/ui/components/input';
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
    <FieldLabel
      htmlFor="settle-date"
      className="text-xs tracking-wider text-muted-foreground uppercase"
    >
      Date
    </FieldLabel>
    <Input
      id="settle-date"
      type="date"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      aria-invalid={errors.length > 0}
    />
    {errors.length > 0 ? <FieldError errors={errors} /> : null}
  </Field>
);
