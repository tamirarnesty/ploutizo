---
status: accepted
---

# Org-scoped data access in API queries

Clerk `tenantGuard` sets `orgId` on every authenticated request, but tenancy was enforced inconsistently in the query layer: some reads filtered by `org_id` on anchor tables only at the HTTP boundary, while child-table reads (assignees, tags, account members) could omit an org join. Write paths sometimes accepted foreign keys without verifying they belong to the active org.

We centralize org scope in `apps/api/src/lib/queries/scope.ts`:

- **Predicates** — `activeTransactions`, `activeAccounts`, `settlementQualifying`, `accountInOrg` for composable `WHERE` clauses.
- **Ownership checks** — `accountExistsInOrg`, `categoryExistsInOrg`, `transactionExistsInOrg`, `allTagsInOrg`, `allMembersInOrg`, `orgMemberExists` for create/update validation before inserts.
- **Settlement helpers** — `assigneeCountsForOrg` (per-org subquery, not a global module singleton).

## Anchor vs child tables

| Kind | Examples | Scoping rule |
|------|----------|--------------|
| Anchor | `accounts`, `transactions`, `categories`, `tags`, `org_members` | Filter `eq(table.orgId, orgId)` on the anchor. |
| Child | `transaction_assignees`, `transaction_tags`, `account_members` | Join through an org-filtered anchor; never read child rows without the anchor join. |

## API conventions

- Query and service helpers take **`orgId` first** when they accept org scope.
- Domain query modules import builders from `scope.ts` instead of duplicating `eq(...orgId)`.
- Services call ownership helpers for every referenced id on writes (accounts, transactions, settlements).

## Consequences

- New queries must compose `scope` predicates or join anchors explicitly; code review checks for `orgId` drift.
- Settlement balance scans use org-scoped assignee counts and qualifying transaction filters only.
- Tests include unit coverage for scope builders and service-level two-org rejection for account/transaction writes.
