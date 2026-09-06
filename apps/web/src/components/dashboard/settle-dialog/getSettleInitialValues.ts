import type { Account, SettlementAccountRow } from '@ploutizo/types';
import {
  composeSettleAmountForPayToward,
  composeSettleFormValues,
} from '@/lib/settlements';
import type { PayToward, SettleFormValues } from '../settleFormSchema';

export const getSettleInitialValues = (
  account: SettlementAccountRow,
  sourceAccounts: readonly Account[],
  todayIso: string,
  payToward: PayToward
): SettleFormValues => ({
  ...composeSettleFormValues(account, sourceAccounts, todayIso, payToward),
  payToward,
});

/** Recompute amount when user changes Pay toward inside the dialog. */
export const getSettleAmountForPayToward = (
  account: SettlementAccountRow,
  payToward: PayToward
): number => composeSettleAmountForPayToward(account, payToward);
