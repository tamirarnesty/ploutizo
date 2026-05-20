import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field';
import { Textarea } from '@ploutizo/ui/components/textarea';
import type { SettleFieldErrors } from '@/components/dashboard/settle-dialog/settleDialogFieldTypes';

export type SettleNotesFieldProps = {
  value: string;
  errors: SettleFieldErrors;
  onChange: (next: string) => void;
  onBlur: () => void;
};

export const SettleNotesField = ({
  value,
  errors,
  onChange,
  onBlur,
}: SettleNotesFieldProps) => (
  <Field data-invalid={errors.length > 0 || undefined}>
    <FieldLabel htmlFor="settle-notes">Notes (optional)</FieldLabel>
    <Textarea
      id="settle-notes"
      rows={3}
      className="resize-none"
      autoComplete="off"
      placeholder="Add a note…"
      maxLength={1000}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      aria-invalid={errors.length > 0}
    />
    {errors.length > 0 ? <FieldError errors={errors} /> : null}
  </Field>
);
