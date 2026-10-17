import { db } from '@ploutizo/db';
import {
  accounts,
  categories,
  tags,
  transactionTags,
  transactions,
} from '@ploutizo/db/schema';
import { and, eq, ilike, inArray, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { categoriesForOrg } from '@/lib/queries/scope';

const escapeIlikeLiteral = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

const ilikePattern = (value: string) => `%${escapeIlikeLiteral(value)}%`;

// Uncorrelated IN subqueries let Postgres hash each lookup once instead of
// running correlated EXISTS lookups per row inside the OR.
export const searchMatchesCondition = (orgId: string, term: string): SQL => {
  const pattern = ilikePattern(term);
  const matchingAccountIds = db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.orgId, orgId), ilike(accounts.name, pattern)));
  const condition = or(
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
  );
  if (condition === undefined) {
    throw new Error('searchMatchesCondition: expected at least one OR branch');
  }
  return condition;
};
