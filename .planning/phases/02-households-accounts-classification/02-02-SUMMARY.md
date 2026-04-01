---
phase: 02-households-accounts-classification
plan: "02"
subsystem: ui
tags: [tanstack-router, clerk, shadcn-sidebar, react-query, organization-switcher]

# Dependency graph
requires:
  - phase: 01-foundation-auth-infrastructure
    provides: "Clerk auth setup, ClerkProvider, authGuard, queryClient/apiFetch"
provides:
  - "Root org guard redirecting to /onboarding if no active org"
  - "/onboarding standalone page with Clerk CreateOrganization"
  - "Pathless sidebar shell layout (_layout.tsx) wrapping all protected routes"
  - "AppSidebar with OrganizationSwitcher (hidePersonal), nav items, Settings group, UserButton"
  - "Mobile sidebar drawer handled natively by shadcn SidebarProvider"
  - "/dashboard stub page inside sidebar shell"
  - "/settings/household with OrganizationProfile and settlement threshold form"
  - "afterSignInUrl=/dashboard and afterSignUpUrl=/dashboard on auth pages (D-11, D-08)"
affects:
  - "02-03 (accounts route will be added under _layout)"
  - "02-04 (categories/tags routes will be added under _layout/settings)"
  - "All future UI phases that add routes inside the sidebar shell"

# Tech tracking
tech-stack:
  added:
    - "shadcn Sidebar (v4) — full suite: Sidebar, SidebarProvider, SidebarInset, SidebarTrigger, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarGroup, SidebarGroupContent, SidebarGroupLabel"
    - "shadcn Sheet, Tooltip, Skeleton, Separator, Input (installed as sidebar dependencies)"
  patterns:
    - "Pathless layout routes (_layout.tsx) wrap protected routes; route segments use _layout prefix"
    - "orgGuard server fn added after authGuard in __root.tsx; both called in beforeLoad (auth skips both, onboarding skips orgGuard only)"
    - "AppSidebar is a presentation component imported by _layout.tsx; mobile responsive via SidebarProvider only (no manual state)"
    - "HouseholdSettings fetched via useQuery(['household-settings']); mutated via useMutation with onSettled invalidation"
    - "Cents/dollars conversion: display /100, save Math.round(dollars * 100)"

key-files:
  created:
    - "apps/web/src/routes/__root.tsx (modified — orgGuard + updated beforeLoad)"
    - "apps/web/src/routes/onboarding.tsx"
    - "apps/web/src/routes/_layout.tsx"
    - "apps/web/src/routes/_layout.dashboard.tsx"
    - "apps/web/src/components/app-sidebar.tsx"
    - "apps/web/src/routes/_layout.settings/route.tsx"
    - "apps/web/src/routes/_layout.settings/household.tsx"
    - "packages/ui/src/components/sidebar.tsx"
    - "packages/ui/src/components/sheet.tsx"
    - "packages/ui/src/components/tooltip.tsx"
    - "packages/ui/src/components/skeleton.tsx"
    - "packages/ui/src/components/separator.tsx"
    - "packages/ui/src/components/input.tsx"
    - "packages/ui/src/hooks/use-mobile.ts"
  modified:
    - "apps/web/src/routes/sign-in.$.tsx (afterSignInUrl added)"
    - "apps/web/src/routes/sign-up.$.tsx (afterSignUpUrl added)"
    - "apps/web/src/routeTree.gen.ts (auto-regenerated)"

key-decisions:
  - "HouseholdSettings type defined inline in household.tsx since @ploutizo/types is empty until plan 02-01 runs; import will be updated when 02-01 executes"
  - "shadcn Sidebar installed at packages/ui level (not apps/web) per component library pattern — accessible via @ploutizo/ui/components/sidebar"
  - "SidebarTrigger placed in header bar of SidebarInset for accessible mobile trigger; no manual open/close state"

patterns-established:
  - "Route hierarchy: _layout.tsx (sidebar shell) > _layout.dashboard.tsx, _layout.settings/route.tsx > _layout.settings/household.tsx"
  - "All new protected routes must be children of /_layout to get the sidebar shell"
  - "shadcn components go in packages/ui/src/components; web app imports via @ploutizo/ui/components/*"

requirements-completed:
  - "§1 Households & Users"

# Metrics
duration: 6min
completed: "2026-04-01"
---

# Phase 02 Plan 02: App Shell & Household Settings Summary

**Sidebar shell with Clerk OrganizationSwitcher and mobile drawer, org guard redirecting to Clerk CreateOrganization onboarding, and household settings page with settlement threshold form**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-01T17:50:35Z
- **Completed:** 2026-04-01T17:56:28Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Root org guard blocks org-less users and redirects to /onboarding; /onboarding renders Clerk CreateOrganization in a clean centered layout
- Sidebar shell layout (_layout.tsx) with SidebarProvider provides mobile drawer natively via shadcn — SidebarTrigger in header, no manual state management needed
- AppSidebar shows OrganizationSwitcher (hidePersonal=true), Dashboard, Accounts, Settings group (Categories & Tags, Merchant Rules, Household), and UserButton
- /settings/household renders OrganizationProfile for member management plus settlement threshold input (cents/dollars conversion)
- afterSignInUrl=/dashboard and afterSignUpUrl=/dashboard wired for correct post-auth landing (invitation acceptance flow)

## Task Commits

Each task was committed atomically:

1. **Task 1: Root org guard, onboarding page, sidebar layout, dashboard stub, sign-in/up redirects** - `c0a2e5e` (feat)
2. **Task 2: Household settings page** - `220dab3` (feat)

**Plan metadata:** (created after self-check)

## Files Created/Modified
- `apps/web/src/routes/__root.tsx` - Added orgGuard server fn and updated beforeLoad with isOnboarding check
- `apps/web/src/routes/onboarding.tsx` - Standalone /onboarding page with Clerk CreateOrganization
- `apps/web/src/routes/_layout.tsx` - Pathless sidebar shell layout (SidebarProvider + AppSidebar + SidebarInset + SidebarTrigger)
- `apps/web/src/routes/_layout.dashboard.tsx` - /dashboard stub page
- `apps/web/src/components/app-sidebar.tsx` - AppSidebar using shadcn Sidebar primitives with Clerk OrganizationSwitcher/UserButton
- `apps/web/src/routes/_layout.settings/route.tsx` - Settings group layout route
- `apps/web/src/routes/_layout.settings/household.tsx` - Settlement threshold form + OrganizationProfile
- `apps/web/src/routes/sign-in.$.tsx` - Added afterSignInUrl="/dashboard"
- `apps/web/src/routes/sign-up.$.tsx` - Added afterSignUpUrl="/dashboard"
- `packages/ui/src/components/sidebar.tsx` - shadcn Sidebar component (installed via CLI)
- `packages/ui/src/components/sheet.tsx` - Sheet (sidebar mobile drawer dependency)
- `packages/ui/src/components/tooltip.tsx` - Tooltip (sidebar dependency)
- `packages/ui/src/components/skeleton.tsx` - Skeleton (sidebar dependency)
- `packages/ui/src/components/separator.tsx` - Separator (sidebar dependency)
- `packages/ui/src/components/input.tsx` - Input (sidebar dependency)
- `packages/ui/src/hooks/use-mobile.ts` - useIsMobile hook (sidebar dependency)
- `apps/web/src/routeTree.gen.ts` - Auto-regenerated with all new routes

## Decisions Made
- HouseholdSettings type defined inline in household.tsx because @ploutizo/types is not populated until plan 02-01 executes. The inline type matches the 02-01-PLAN.md interface spec exactly (`{ settlementThreshold: number | null }`). Will be updated to import from `@ploutizo/types` when 02-01 runs.
- shadcn Sidebar installed at packages/ui level (shared component library) rather than apps/web, matching the established pattern for all UI components.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Defined HouseholdSettings type inline**
- **Found during:** Task 2 (household settings page)
- **Issue:** Plan specified `import type { HouseholdSettings } from '@ploutizo/types'` but packages/types/src/index.ts exports nothing yet (plan 02-01 hasn't run). TypeScript would fail.
- **Fix:** Defined `interface HouseholdSettings { settlementThreshold: number | null }` inline in household.tsx with a comment documenting the pending import.
- **Files modified:** apps/web/src/routes/_layout.settings/household.tsx
- **Verification:** `pnpm build --filter web` exits 0 with no type errors
- **Committed in:** 220dab3 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Necessary to unblock build. The inline type is identical to the spec — no behavioral difference. Must be updated when plan 02-01 executes.

## Known Stubs
- `/dashboard` — `apps/web/src/routes/_layout.dashboard.tsx`: renders a placeholder message ("Your financial overview will appear here once you've added accounts and transactions"). This is intentional per plan spec; dashboard content is built in a future phase.
- `/accounts` nav link in AppSidebar points to `/accounts` which doesn't exist yet (plan 03 creates it). Navigation will 404 until then — documented in code comment.
- `/settings/categories` and `/settings/merchant-rules` nav links point to routes that don't exist yet (created in plan 04). Navigation will 404 until then — documented in code comment.

## Issues Encountered
- shadcn CLI interactive prompt asked about overwriting existing `button.tsx`. Answered "no" to preserve the existing component. All other files were new.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All protected routes now have a sidebar shell — plan 02-03 can add /accounts under /_layout without any additional layout work
- AppSidebar nav items are already wired; adding routes to the correct paths will make them live automatically
- /settings/household is functional pending the API (plan 02-01 must run first for GET/PATCH /api/households/settings)

## Self-Check: PASSED

All created files verified present. Both task commits confirmed in git log.

---
*Phase: 02-households-accounts-classification*
*Completed: 2026-04-01*
