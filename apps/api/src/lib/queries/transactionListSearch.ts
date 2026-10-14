import { db } from '@ploutizo/db';
import {
  accounts,
  categories,
  tags,
  transactionTags,
  transactions,
} from '@ploutizo/db/schema';
import { and, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { categoriesForOrg } from '@/lib/queries/scope';

/** Keep in sync with `listAggregateSignedAmountCents` in `@ploutizo/utils`. */
export const listedAmountCentsSql = sql<number>`case
  when ${transactions.type} = 'expense' then -${transactions.amount}
  when ${transactions.type} = 'transfer' then 0
  else ${transactions.amount}
end`;

export const escapeIlikeLiteral = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

export const ilikePattern = (value: string) => `%${escapeIlikeLiteral(value)}%`;

const descriptionOrRawDescriptionIlike = (pattern: string) =>
  sql`(${transactions.description} ILIKE ${pattern} OR ${transactions.rawDescription} ILIKE ${pattern})`;

export const descriptionTextFilter = (description: string): SQL =>
  descriptionOrRawDescriptionIlike(ilikePattern(description));

// Uncorrelated IN subqueries let Postgres hash each lookup once instead of
// running correlated EXISTS lookups per row inside the OR.
export const searchMatchesCondition = (orgId: string, term: string): SQL => {
  const pattern = ilikePattern(term);
  const matchingAccountIds = db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.orgId, orgId), ilike(accounts.name, pattern)));
  return or(
    ilike(transactions.description, pattern),
    ilike(transactions.rawDescription, pattern),
    inArray(
      transactions.categoryId,
      db
        .select({ id: categories.id })
        .from(categories)
        .where(and(...categoriesForOrg(orgId), ilike(categories.name, pattern)))
    ),
    inArray(transactions.accountId, matchingAccountIds),
    inArray(transactions.counterpartAccountId, matchingAccountIds),
    inArray(
      transactions.id,
      db
        .select({ id: transactionTags.transactionId })
        .from(transactionTags)
        .innerJoin(tags, eq(transactionTags.tagId, tags.id))
        .where(and(eq(tags.orgId, orgId), ilike(tags.name, pattern)))
    )
  )!;
};
