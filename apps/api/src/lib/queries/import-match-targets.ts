import { db } from '@ploutizo/db';
import { transactions } from '@ploutizo/db/schema';
import { and, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm';
import type { DbClient } from '@ploutizo/db';
import type { MatchTargetFact } from '@ploutizo/types';
import type { SQL } from 'drizzle-orm';

export interface ImportMatchTargetQueryInput {
  /** Saved decision IDs — loaded even when soft-deleted. */
  extraIds?: readonly string[];
  minDate?: string | null;
  maxDate?: string | null;
  externalIds?: readonly string[];
}

const activeAccountCandidateFilter = (
  accountId: string,
  input: ImportMatchTargetQueryInput
): SQL | undefined => {
  const candidateParts: SQL[] = [];
  if (input.minDate && input.maxDate) {
    const dateRangeFilter = and(
      gte(transactions.date, input.minDate),
      lte(transactions.date, input.maxDate)
    );
    if (dateRangeFilter) {
      candidateParts.push(dateRangeFilter);
    }
  }

  const externalIds = [...new Set((input.externalIds ?? []).filter(Boolean))];
  if (externalIds.length > 0) {
    candidateParts.push(inArray(transactions.externalId, externalIds));
  }

  if (candidateParts.length === 0) return undefined;

  return and(
    eq(transactions.accountId, accountId),
    isNull(transactions.deletedAt),
    candidateParts.length === 1 ? candidateParts[0] : or(...candidateParts)
  );
};

/**
 * Load match/refund suggestion targets for the destination card.
 * Active rows are constrained to the import date window (plus settlement
 * tolerance) and row external IDs; extra ids (saved decisions) are loaded even
 * when soft-deleted so invalidated matches stay explainable.
 */
export const listImportMatchTargets = async (
  orgId: string,
  accountId: string,
  input: ImportMatchTargetQueryInput = {},
  client: DbClient = db
): Promise<Map<string, MatchTargetFact>> => {
  const result = new Map<string, MatchTargetFact>();
  const uniqueExtraIds = [...new Set((input.extraIds ?? []).filter(Boolean))];
  const activeAccountFilter = activeAccountCandidateFilter(accountId, input);

  const scopeFilter =
    activeAccountFilter && uniqueExtraIds.length > 0
      ? or(activeAccountFilter, inArray(transactions.id, uniqueExtraIds))
      : (activeAccountFilter ??
        (uniqueExtraIds.length > 0
          ? inArray(transactions.id, uniqueExtraIds)
          : undefined));

  if (!scopeFilter) return result;

  const rows = await client
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      type: transactions.type,
      date: transactions.date,
      amount: transactions.amount,
      description: transactions.description,
      rawDescription: transactions.rawDescription,
      externalId: transactions.externalId,
      deletedAt: transactions.deletedAt,
    })
    .from(transactions)
    .where(and(eq(transactions.orgId, orgId), scopeFilter));

  for (const row of rows) {
    result.set(row.id, {
      id: row.id,
      accountId: row.accountId,
      type: row.type,
      date: row.date,
      amount: row.amount,
      description: row.description,
      rawDescription: row.rawDescription,
      externalId: row.externalId,
      deleted: row.deletedAt != null,
    });
  }

  return result;
};

/** Active (non-deleted) external-id owners on one account. */
export const listActiveExternalIdOwners = async (
  orgId: string,
  accountId: string,
  externalIds: readonly string[],
  client: DbClient = db
): Promise<Map<string, string>> => {
  const ids = [...new Set(externalIds.filter(Boolean))];
  if (ids.length === 0) return new Map();

  const rows = await client
    .select({
      id: transactions.id,
      externalId: transactions.externalId,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.orgId, orgId),
        eq(transactions.accountId, accountId),
        isNull(transactions.deletedAt),
        inArray(transactions.externalId, ids)
      )
    );

  return new Map(
    rows.flatMap((row) =>
      row.externalId ? [[row.externalId, row.id] as const] : []
    )
  );
};
