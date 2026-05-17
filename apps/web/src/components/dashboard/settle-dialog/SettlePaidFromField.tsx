import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import type { Account } from '@ploutizo/types';
import type { SettleFieldErrors } from '@/components/dashboard/settle-dialog/settleDialogFieldTypes';

export type SettlePaidFromFieldProps = {
  sourceAccountOptions: readonly Account[];
  value: string;
  errors: SettleFieldErrors;
  onValueChange: (accountId: string) => void;
};

export const SettlePaidFromField = ({
  sourceAccountOptions,
  value,
  errors,
  onValueChange,
}: SettlePaidFromFieldProps) => (
  <Field data-invalid={errors.length > 0 || undefined}>
    <FieldLabel
      htmlFor="settle-source"
      className="text-xs tracking-wider text-muted-foreground uppercase"
    >
      Paid from
    </FieldLabel>
    <Select value={value} onValueChange={(v) => v && onValueChange(v)}>
      <SelectTrigger id="settle-source">
        <SelectValue>
          {sourceAccountOptions.find((a) => a.id === value)?.name ??
            'Select account'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {sourceAccountOptions.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {errors.length > 0 ? <FieldError errors={errors} /> : null}
  </Field>
);
