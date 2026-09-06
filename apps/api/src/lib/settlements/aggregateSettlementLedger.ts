/**
 * ADR 0002 settlement ledger bucketing — pure in-memory aggregation.
 *
 * Qualifying scan rows (already org-scoped and signed by the query layer) are
 * classified by assignee count per transaction, not by summing assignee rows
 * into a single member balance:
 *   - count === 1 → personal transaction; signed assignee amount on that member
 *   - count >= 2  → shared transaction; signed transaction amount once per tx
 *     on the card, plus the member as a shared participant
 *
 * Signing (expense +, refund/settlement −) stays in the query. This module
 * only buckets already-signed cents.
 */

export type SettlementLedgerScanRow = {
  accountId: string;
  transactionId: string;
  memberId: string;
  assigneeCount: number;
  signedAssigneeCents: number;
  signedTransactionCents: number;
};

export type SettlementLedgerBuckets = {
  personalByPair: Map<string, number>;
  sharedByAccount: Map<string, number>;
  participantsByAccount: Map<string, string[]>;
};

/** Lookup key for one member's personal balance on one card. */
export const settlementLedgerPairKey = (
  accountId: string,
  memberId: string
): string => `${accountId}:${memberId}`;

/**
 * Bucket qualifying assignee scan rows into personal balances, shared
 * balances, and shared participant ids (ADR 0002).
 */
export const aggregateSettlementLedger = (
  scanRows: readonly SettlementLedgerScanRow[]
): SettlementLedgerBuckets => {
  const personalByPair = new Map<string, number>();
  const sharedByAccount = new Map<string, number>();
  const sharedTxSeen = new Set<string>();
  const participantsByAccount = new Map<string, Set<string>>();

  for (const row of scanRows) {
    const count = row.assigneeCount;
    const accountId = row.accountId;
    const txKey = `${accountId}:${row.transactionId}`;

    if (count === 1) {
      const pairKey = settlementLedgerPairKey(accountId, row.memberId);
      personalByPair.set(
        pairKey,
        (personalByPair.get(pairKey) ?? 0) + row.signedAssigneeCents
      );
    } else if (count >= 2) {
      if (!sharedTxSeen.has(txKey)) {
        sharedTxSeen.add(txKey);
        sharedByAccount.set(
          accountId,
          (sharedByAccount.get(accountId) ?? 0) + row.signedTransactionCents
        );
      }
      const set = participantsByAccount.get(accountId) ?? new Set<string>();
      set.add(row.memberId);
      participantsByAccount.set(accountId, set);
    }
  }

  const participantsByAccountSorted = new Map<string, string[]>();
  for (const [accountId, ids] of participantsByAccount) {
    participantsByAccountSorted.set(
      accountId,
      [...ids].sort((a, b) => a.localeCompare(b))
    );
  }

  return {
    personalByPair,
    sharedByAccount,
    participantsByAccount: participantsByAccountSorted,
  };
};
