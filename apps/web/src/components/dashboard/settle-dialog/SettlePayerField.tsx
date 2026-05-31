import {
  Field,
  FieldError,
  FieldLegend,
  FieldSet,
} from '@ploutizo/ui/components/field';
import type { SettlementAccountRow } from '@ploutizo/types';
import type { SettleFieldErrors } from '@/components/dashboard/settle-dialog/settleDialogFieldTypes';
import { SettleMemberRadioList } from '@/components/dashboard/settle-dialog/SettleMemberRadioList';
import type { PayToward } from '@/components/dashboard/settleFormSchema';

export type SettlePayerFieldProps = {
  account: SettlementAccountRow;
  value: PayToward;
  errors: SettleFieldErrors;
  onPayTowardChange: (payToward: PayToward) => void;
};

export const SettlePayerField = ({
  account,
  value,
  errors,
  onPayTowardChange,
}: SettlePayerFieldProps) => (
  <Field data-invalid={errors.length > 0 || undefined}>
    <FieldSet>
      <FieldLegend variant="label">Pay toward</FieldLegend>
      <SettleMemberRadioList
        account={account}
        value={value}
        onValueChange={onPayTowardChange}
      />
    </FieldSet>
    {errors.length > 0 ? <FieldError errors={errors} /> : null}
  </Field>
);
