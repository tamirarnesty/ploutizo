import { dollarsToCents } from '@ploutizo/utils/currency';
import type { SettlementAccountRow } from '@ploutizo/types';
import type { CreateSettlementInput } from '@ploutizo/validators';
import type { SettlePayToward } from './composeSettleForm';

export type SettleFormPayloadValues = {
  payToward: SettlePayToward;
  amountDollars: number;
  sourceAccountId: string;
  date: string;
  notes?: string;
};

/**
 * Map settle-dialog form values to POST /api/settlements.
 * Personal vs shared assignees and empty-notes omission stay here.
 */
export const toCreateSettlementPayload = (
  account: SettlementAccountRow,
  value: SettleFormPayloadValues
): CreateSettlementInput => {
  const amountCents = dollarsToCents(value.amountDollars);
  const trimmedNotes = value.notes?.trim() ?? '';
  const assignees =
    value.payToward === 'shared'
      ? account.sharedParticipantIds.map((memberId) => ({ memberId }))
      : [{ memberId: value.payToward }];

  return {
    assignees,
    accountId: account.account.id,
    counterpartAccountId: value.sourceAccountId,
    amountCents,
    date: value.date,
    ...(trimmedNotes.length > 0 ? { notes: trimmedNotes } : {}),
  };
};
