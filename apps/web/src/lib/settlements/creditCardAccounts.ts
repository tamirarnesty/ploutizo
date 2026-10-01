import type { SettlementAccountRow } from '@ploutizo/validators';

export const selectCreditCardAccounts = (
  accounts: SettlementAccountRow[] | undefined
): SettlementAccountRow[] =>
  (accounts ?? []).filter((row) => row.account.type === 'credit_card');
