import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field';
import { Text } from '@ploutizo/ui/components/text';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@ploutizo/ui/components/input-group';
import type { SettleFieldErrors } from '@/components/dashboard/settle-dialog/settleDialogFieldTypes';

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
    <div className="flex items-center justify-between">
      <FieldLabel
        htmlFor="settle-amount"
        className="text-xs tracking-wider text-muted-foreground uppercase"
      >
        Amount
      </FieldLabel>
      <Text variant="caption" className="text-xs text-muted-foreground">
        Partial OK
      </Text>
    </div>
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <InputGroupText>$</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        id="settle-amount"
        type="number"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        step="0.01"
        value={Number.isFinite(value) ? String(value) : ''}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onChange(Number.isFinite(v) ? v : 0);
        }}
        onBlur={onBlur}
        aria-invalid={errors.length > 0}
      />
    </InputGroup>
    {errors.length > 0 ? <FieldError errors={errors} /> : null}
  </Field>
);
