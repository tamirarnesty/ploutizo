---
phase: quick-260411-r4m
plan: 01
subsystem: auth/webhooks/types
tags: [schema, migration, webhooks, types, clerk]
dependency_graph:
  requires: []
  provides: [org-display-data, user-display-data, org-member-type-v2]
  affects: [apps/api/src/routes/webhooks.ts, packages/db/src/schema/auth.ts, packages/types/src/index.ts]
tech_stack:
  added: []
  patterns: [drizzle-update-where, svix-idempotent-upsert]
key_files:
  created:
    - packages/db/drizzle/0003_charming_baron_zemo.sql
  modified:
    - packages/db/src/schema/auth.ts
    - apps/api/src/routes/webhooks.ts
    - packages/types/src/index.ts
decisions:
  - organization.updated and user.updated use db.update().set().where() — safe on Svix retries only if row exists (created event must arrive first, which is the natural Clerk order)
  - OrgMember fields are nullable matching Clerk's optional field contract
metrics:
  duration: ~8m
  completed: "2026-04-11"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 4
---

# Quick Task 260411-r4m: User/Org Display Attributes Summary

**One-liner:** Stored Clerk org name + image_url and user image_url/first_name/last_name locally via schema migration and four webhook handlers, exposing them on OrgMember type for Clerk-free UI rendering.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Extend orgs and users schema with display attributes | 6fbe7c9 | packages/db/src/schema/auth.ts, packages/db/drizzle/0003_charming_baron_zemo.sql |
| 2 | Update webhook handlers to persist new fields | 0fdf35b | apps/api/src/routes/webhooks.ts |
| 3 | Add imageUrl, firstName, lastName to OrgMember type | 38ade1e | packages/types/src/index.ts |

## Migration Verification

`packages/db/drizzle/0003_charming_baron_zemo.sql` contains exactly 5 ADD COLUMN statements:
- `orgs`: name (text), image_url (text)
- `users`: image_url (text), first_name (text), last_name (text)

No DROP or destructive statements present.

## Webhook Coverage

`apps/api/src/routes/webhooks.ts` now handles 5 event types:
1. `organization.created` — insert with id, name, imageUrl + seedOrg
2. `organization.updated` — update name, imageUrl, updatedAt
3. `user.created` — insert with externalId, email, fullName, firstName, lastName, imageUrl
4. `user.updated` — update email, fullName, firstName, lastName, imageUrl
5. `organizationMembership.created` — unchanged

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints or auth paths introduced. Webhook route already existed and was guarded by Svix signature verification.

## Self-Check: PASSED

- packages/db/src/schema/auth.ts — FOUND
- packages/db/drizzle/0003_charming_baron_zemo.sql — FOUND
- apps/api/src/routes/webhooks.ts — FOUND
- packages/types/src/index.ts — FOUND
- Commits 6fbe7c9, 0fdf35b, 38ade1e — FOUND
