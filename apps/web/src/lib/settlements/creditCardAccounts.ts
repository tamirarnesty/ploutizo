import type { SettlementAccountRow } from '@ploutizo/types';

export const selectCreditCardAccounts = (
  accounts: SettlementAccountRow[] | undefined
): SettlementAccountRow[] =>
  (accounts ?? []).filter((row) => row.account.type === 'credit_card');
