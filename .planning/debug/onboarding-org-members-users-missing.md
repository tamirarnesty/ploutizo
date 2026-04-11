---
status: resolved
trigger: "After signup + household creation, Clerk org is created and user is a member in Clerk, orgs table has the org, but org_members table has no entry for the user AND users table has no entry for the user. Additionally, /settings/household/organization-members shows Not Found. Neither issue has ever worked."
created: 2026-04-10T00:00:00Z
updated: 2026-04-11T00:00:00Z
resolved: 2026-04-11T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED AND FIXED — All issues addressed including follow-up items.
test: N/A — fixes applied
expecting: webhook secret env var documented; Members tab highlights on /settings/organization-members
next_action: human verification of tab highlight fix and webhook env var setup

## Symptoms

expected: After creating account and household, user should be inserted into `users` table and `org_members` table. `/settings/household/organization-members` should render the org members management page.
actual: `users` table empty, `org_members` table empty despite Clerk org+membership existing. Route `/settings/household/organization-members` returns Not Found.
errors: No specific error messages provided — check API logs and code for silent failures.
reproduction: Sign up as a new user, complete household creation onboarding flow.
started: Never worked — not a regression.

## Eliminated

- hypothesis: DB schema missing users/org_members tables
  evidence: Tables exist in packages/db/src/schema/auth.ts with correct structure
  timestamp: 2026-04-10

- hypothesis: Onboarding component makes API calls that fail
  evidence: Onboarding component only renders Clerk's CreateOrganization UI; all data flow is via webhooks
  timestamp: 2026-04-10

- hypothesis: Members tab value mismatch with location.pathname
  evidence: Tab value and pathname are both /settings/organization-members — exact match works. But Clerk's OrganizationProfile pushes sub-routes like /settings/household/* which break exact matching for the Household tab. Fixed with startsWith prefix matching.
  timestamp: 2026-04-10

## Evidence

- timestamp: 2026-04-10
  checked: apps/api/src/routes/webhooks.ts
  found: Only handles organization.created — inserts into orgs and seeds categories. No user.created or organizationMembership.created handlers.
  implication: users and org_members tables never populated; root cause of empty tables.

- timestamp: 2026-04-10
  checked: apps/web/src/routes/_layout.settings/
  found: Only categories.tsx, household.tsx, merchant-rules.tsx, route.tsx — no organization-members.tsx
  implication: Route /settings/organization-members not registered in router; root cause of Not Found.

- timestamp: 2026-04-10
  checked: apps/web/src/routeTree.gen.ts
  found: organization-members absent from all FileRoutesByFullPath, FileRoutesById, FileRouteTypes, LayoutSettingsRouteRouteChildren
  implication: Confirms route was not registered; fixed by updating gen file.

- timestamp: 2026-04-10
  checked: apps/api/src/routes/webhooks.ts webhook secret handling
  found: Reads process.env.CLERK_WEBHOOK_SECRET. apps/api/.env.example shows CLERK_WEBHOOK_SECRET=whsec_...
  implication: Config-only issue — env var must be set in deployment and local .env to match Clerk dashboard signing secret.

- timestamp: 2026-04-10
  checked: apps/web/src/routes/_layout.settings/route.tsx active tab logic
  found: Used value={location.pathname} with exact equality matching. When Clerk's OrganizationProfile (in HouseholdSettings) pushes sub-routes like /settings/household/*, Household tab loses highlight. Members tab at /settings/organization-members also affected if path doesn't match exactly.
  implication: Changed to startsWith prefix matching — active tab is the first tab whose value is a prefix of location.pathname.

## Resolution

root_cause: |
  Four separate issues: (1) Clerk webhook handler only handled organization.created — missing user.created and organizationMembership.created. (2) Route /settings/organization-members file didn't exist. (3) CLERK_WEBHOOK_SECRET env var not set in apps/api (config issue, not code). (4) Settings tab active state used exact pathname equality — broke when Clerk's OrganizationProfile pushed sub-routes.

fix: |
  1. Added user.created handler to webhooks.ts.
  2. Added organizationMembership.created handler to webhooks.ts.
  3. Created apps/web/src/routes/_layout.settings/organization-members.tsx.
  4. Created apps/web/src/components/settings/OrganizationMembersSettings.tsx.
  5. Added Members tab to settings layout route.tsx.
  6. Updated routeTree.gen.ts.
  7. (Config) User must set CLERK_WEBHOOK_SECRET in apps/api env.
  8. Changed tab active detection to startsWith prefix matching in route.tsx.

verification: tsc --noEmit passes; startsWith matching verified by code inspection
files_changed:
  - apps/api/src/routes/webhooks.ts
  - apps/web/src/routes/_layout.settings/organization-members.tsx
  - apps/web/src/components/settings/OrganizationMembersSettings.tsx
  - apps/web/src/routes/_layout.settings/route.tsx
  - apps/web/src/routeTree.gen.ts
