---
status: resolved
trigger: "create-account-fk-violation: Creating an account fails with a foreign key constraint violation — the org_id is not found in the orgs table."
created: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:00:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: The org row for org_3BfV1FMmvzj41G2F3F6xVdN8fdt was never inserted into the orgs table because the Clerk organization.created webhook either never fired, failed signature verification, or failed to deliver. The accounts table has a FK to orgs.id, so any insert into accounts fails if the org row is missing.
test: CONFIRMED — webhooks.ts only seeds orgs on organization.created; no upsert-on-demand fallback exists anywhere
expecting: Fix: add an upsert of the orgs row in tenantGuard so any valid Clerk orgId is guaranteed to exist locally before API calls proceed
next_action: implement upsert in tenantGuard.ts

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: POST to create account route succeeds and inserts a new account row
actual: DrizzleQueryError — insert or update on table "accounts" violates foreign key constraint "accounts_org_id_orgs_id_fk"
errors: |
  DrizzleQueryError: Failed query: insert into "accounts" (...) values (default, $1, ...) returning ...
  params: org_3BfV1FMmvzj41G2F3F6xVdN8fdt, Tamir's Chequing, chequing, TD, false
  cause: error: insert or update on table "accounts" violates foreign key constraint "accounts_org_id_orgs_id_fk"

  Stack points to:
    apps/api/src/routes/accounts.ts:30 (inside transaction)
    apps/api/src/middleware/tenantGuard.ts:16
reproduction: Make a POST request to create an account with org_id = org_3BfV1FMmvzj41G2F3F6xVdN8fdt
started: Reported now — unclear if ever worked

## Eliminated
<!-- APPEND only - prevents re-investigating -->

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-04-03T00:00:00Z
  checked: apps/api/src/routes/webhooks.ts
  found: Only handles organization.created event. On that event it does db.insert(orgs).values({ id: event.data.id }).onConflictDoNothing() then seedOrg(). No other event creates an orgs row.
  implication: If the webhook never fired or failed, the org row is never inserted.

- timestamp: 2026-04-03T00:00:00Z
  checked: packages/db/src/schema/auth.ts
  found: orgs table uses the Clerk org ID string as primary key (text PK). accounts.org_id references orgs.id with FK constraint.
  implication: Every account insert requires the org row to pre-exist.

- timestamp: 2026-04-03T00:00:00Z
  checked: apps/api/src/middleware/tenantGuard.ts
  found: tenantGuard only checks !orgId (falsy) and rejects if missing. Does NOT upsert the org row. Does NOT verify the org exists in DB.
  implication: A valid Clerk orgId passes tenantGuard but the org row may still be absent from the DB.

- timestamp: 2026-04-03T00:00:00Z
  checked: create_account_logs.txt
  found: Confirms the exact FK violation with params: org_3BfV1FMmvzj41G2F3F6xVdN8fdt. The org_id value is real/valid from Clerk auth, but the row is missing from the local orgs table.
  implication: Root cause confirmed — orgs row was never seeded. Webhook path failed or never ran.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: The orgs row for the active Clerk org was never inserted into the local database. The only path that creates an orgs row is the organization.created Clerk webhook (webhooks.ts). If that webhook fails to deliver — due to a misconfigured CLERK_WEBHOOK_SECRET, network failure, or org created before the app was deployed — no orgs row exists. Any subsequent insert into accounts (or any table with FK to orgs.id) fails with the FK constraint violation.

fix: Added an upsert guard in tenantGuard.ts: before calling next(), it runs db.insert(orgs).values({ id: orgId }).onConflictDoNothing(). This ensures the orgs row exists for any valid Clerk orgId before any API handler runs. The webhook remains the authoritative creation path; this is a safety net that prevents FK violations when the webhook fails.

verification: All 28 API tests pass. tenantGuard tests now cover: upsert runs on valid orgId, upsert does NOT run when orgId is missing (401 returned before reaching upsert).

files_changed:
  - apps/api/src/middleware/tenantGuard.ts
  - apps/api/src/__tests__/tenantGuard.test.ts
