import { getTransactionTypePolicy } from '@ploutizo/utils/transaction-policy';
import { dollarsToCents } from '@ploutizo/utils/currency';
import type { TransactionScalarField } from '@ploutizo/utils/transaction-policy';
import type { TransactionFormValues } from './types';

const optionalFormValue = (value: string): string | undefined =>
  value || undefined;

/**
 * Map the flat transaction form onto the create/PATCH payload.
 * Includes only policy-relevant scalar fields and extra account slots.
 * Always send `assignees` / `tagIds` as arrays (possibly empty). The API PATCH
 * path uses `undefined` to mean "leave existing rows unchanged"; `[]` means
 * replace-all with nothing (clear splits / tags).
 */
export const toTransactionApiPayload = (
  value: TransactionFormValues
): Record<string, unknown> => {
  const policy = getTransactionTypePolicy(value.type);
  const payload: Record<string, unknown> = {
    type: value.type,
    accountId: value.accountId,
    amount:
      value.amount === undefined || !Number.isFinite(value.amount)
        ? 0
        : dollarsToCents(value.amount),
    date: value.date,
    description: value.description.trim(),
    notes: value.notes.trim() || undefined,
    tagIds: value.tagIds,
    assignees: value.assignees.map((assignee) => ({
      memberId: assignee.memberId,
      amountCents: assignee.amountCents,
      percentage: assignee.percentage,
    })),
  };

  for (const slot of policy.accountSlots) {
    if (slot.field === 'accountId') continue;
    const slotValue = optionalFormValue(value[slot.field]);
    if (slotValue) payload[slot.field] = slotValue;
  }

  for (const field of Object.keys(
    policy.scalarFields
  ) as TransactionScalarField[]) {
    if (field === 'notes') continue;
    const fieldValue = optionalFormValue(value[field]);
    if (fieldValue) payload[field] = fieldValue;
  }

  return payload;
};
