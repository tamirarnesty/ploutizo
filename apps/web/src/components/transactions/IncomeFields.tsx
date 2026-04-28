/**
 * IncomeFields — incomeSource text input removed in Plan 05 (D-09).
 * incomeType Select remains in TransactionTypeFields (IncomeTypeField subcomponent).
 * This component is intentionally empty; its call site is removed from TransactionTypeFields.
 */
export type IncomeFieldsProps = Record<string, never>;

export const IncomeFields = (_props: IncomeFieldsProps): null => null;
