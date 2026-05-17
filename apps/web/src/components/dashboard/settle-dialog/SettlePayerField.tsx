import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field';
import type { SettlementAccountRow } from '@ploutizo/types';
import type { SettleFieldErrors } from '@/components/dashboard/settle-dialog/settleDialogFieldTypes';
import { SettleMemberRadioList } from '@/components/dashboard/settle-dialog/SettleMemberRadioList';

export type SettlePayerFieldProps = {
  account: SettlementAccountRow;
  value: string;
  errors: SettleFieldErrors;
  onPayerMemberChange: (memberId: string) => void;
};

export const SettlePayerField = ({
  account,
  value,
  errors,
  onPayerMemberChange,
}: SettlePayerFieldProps) => (
  <Field data-invalid={errors.length > 0 || undefined}>
    <FieldLabel className="text-xs tracking-wider text-muted-foreground uppercase">
      Settling for
    </FieldLabel>
    <SettleMemberRadioList
      members={account.members}
      value={value}
      onValueChange={onPayerMemberChange}
    />
    {errors.length > 0 ? <FieldError errors={errors} /> : null}
  </Field>
);
