import { settleFormSchema } from '../settleFormSchema';
import type { SettleFormValues } from '../settleFormSchema';

/** TanStack Form `onSubmit` validator — returns a single combined message or undefined. */
export const getSettleFormSubmitValidationError = (
  value: SettleFormValues
): string | undefined => {
  const result = settleFormSchema.safeParse(value);
  if (!result.success) {
    return result.error.issues.map((i) => i.message).join(', ');
  }
};

export type SettleFormSubmitValidatorArgs = {
  value: SettleFormValues;
};
